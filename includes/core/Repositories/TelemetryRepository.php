<?php
namespace App\Core\Repositories;

use App\Core\Interfaces\TelemetryRepositoryInterface;
use App\Config\Database\DatabaseManager;
use App\Core\System\DatabaseConstants as DB;
use PDO;

class TelemetryRepository implements TelemetryRepositoryInterface {
    private $session;
    public function __construct() {
        $cassandra = new \App\Config\Database\CassandraManager();
        $this->session = $cassandra->getSession();
    }

    private function getDateRangeList(string $startDate, string $endDate): array {
        try {
            $start = new \DateTime($startDate);
            $end = new \DateTime($endDate);
        } catch (\Exception $e) {
            return [];
        }

        $dates = [];
        $interval = new \DateInterval('P1D');
        $realEnd = clone $end;
        $realEnd->modify('+1 day');
        $period = new \DatePeriod($start, $interval, $realEnd);
        
        foreach ($period as $date) {
            $dateStr = $date->format('Y-m-d');
            if ($dateStr <= $end->format('Y-m-d')) {
                $dates[] = $dateStr;
            }
        }
        return array_unique($dates);
    }

    public function getApiLatencyStats(string $startDate, string $endDate): array {
        if (!$this->session) {
            return [];
        }

        $dates = $this->getDateRangeList($startDate, $endDate);
        if (empty($dates)) {
            return [];
        }

        $datesPlaceholder = implode(', ', array_fill(0, count($dates), '?'));
        $cql = "SELECT endpoint, method, latency_ms, created_at FROM db_telemetry_nosql.api_latency WHERE date_only IN ({$datesPlaceholder})";
        
        try {
            $stmt = $this->session->prepare($cql);
            $rows = $this->session->execute($stmt, $dates)->asRowsResult();
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Cassandra api_latency query failed", ['exception' => $e->getMessage()]);
            return [];
        }

        $aggregated = [];
        $startLimit = new \DateTime($startDate);
        $endLimit = new \DateTime($endDate);

        foreach ($rows as $row) {
            $createdAt = $row['created_at'];
            if ($createdAt instanceof \DateTime) {
                $createdAtDt = $createdAt;
            } else {
                try {
                    $createdAtDt = new \DateTime($createdAt);
                } catch (\Exception $ex) {
                    continue;
                }
            }

            if ($createdAtDt >= $startLimit && $createdAtDt <= $endLimit) {
                $key = $row['endpoint'] . '|' . $row['method'];
                if (!isset($aggregated[$key])) {
                    $aggregated[$key] = [
                        'endpoint' => $row['endpoint'],
                        'method' => $row['method'],
                        'sum_latency' => 0.0,
                        'total_requests' => 0
                    ];
                }
                $aggregated[$key]['sum_latency'] += (float)$row['latency_ms'];
                $aggregated[$key]['total_requests']++;
            }
        }

        $result = [];
        foreach ($aggregated as $item) {
            $item['avg_latency'] = $item['total_requests'] > 0 ? $item['sum_latency'] / $item['total_requests'] : 0.0;
            unset($item['sum_latency']);
            $result[] = $item;
        }

        usort($result, function($a, $b) {
            return $b['avg_latency'] <=> $a['avg_latency'];
        });

        return $result;
    }

    public function getPageviewsStats(string $startDate, string $endDate): array {
        if (!$this->session) {
            return [];
        }

        $dates = $this->getDateRangeList($startDate, $endDate);
        if (empty($dates)) {
            return [];
        }

        $datesPlaceholder = implode(', ', array_fill(0, count($dates), '?'));
        $cql = "SELECT path, load_time_ms, created_at FROM db_telemetry_nosql.pageviews WHERE date_only IN ({$datesPlaceholder})";
        
        try {
            $stmt = $this->session->prepare($cql);
            $rows = $this->session->execute($stmt, $dates)->asRowsResult();
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Cassandra pageviews query failed", ['exception' => $e->getMessage()]);
            return [];
        }

        $aggregated = [];
        $startLimit = new \DateTime($startDate);
        $endLimit = new \DateTime($endDate);

        foreach ($rows as $row) {
            $createdAt = $row['created_at'];
            if ($createdAt instanceof \DateTime) {
                $createdAtDt = $createdAt;
            } else {
                try {
                    $createdAtDt = new \DateTime($createdAt);
                } catch (\Exception $ex) {
                    continue;
                }
            }

            if ($createdAtDt >= $startLimit && $createdAtDt <= $endLimit) {
                $key = $row['path'];
                if (!isset($aggregated[$key])) {
                    $aggregated[$key] = [
                        'path' => $row['path'],
                        'visits' => 0,
                        'sum_load_time' => 0.0
                    ];
                }
                $aggregated[$key]['visits']++;
                $aggregated[$key]['sum_load_time'] += (float)$row['load_time_ms'];
            }
        }

        $result = [];
        foreach ($aggregated as $item) {
            $item['avg_load_time'] = $item['visits'] > 0 ? $item['sum_load_time'] / $item['visits'] : 0.0;
            unset($item['sum_load_time']);
            $result[] = $item;
        }

        usort($result, function($a, $b) {
            return $b['visits'] <=> $a['visits'];
        });

        return $result;
    }

    public function getAuthEventsStats(string $startDate, string $endDate): array {
        if (!$this->session) {
            return [];
        }

        $dates = $this->getDateRangeList($startDate, $endDate);
        if (empty($dates)) {
            return [];
        }

        $datesPlaceholder = implode(', ', array_fill(0, count($dates), '?'));
        $cql = "SELECT event_type, created_at FROM db_telemetry_nosql.auth_events WHERE date_only IN ({$datesPlaceholder})";
        
        try {
            $stmt = $this->session->prepare($cql);
            $rows = $this->session->execute($stmt, $dates)->asRowsResult();
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Cassandra auth_events query failed", ['exception' => $e->getMessage()]);
            return [];
        }

        $aggregated = [];
        $startLimit = new \DateTime($startDate);
        $endLimit = new \DateTime($endDate);

        foreach ($rows as $row) {
            $createdAt = $row['created_at'];
            if ($createdAt instanceof \DateTime) {
                $createdAtDt = $createdAt;
            } else {
                try {
                    $createdAtDt = new \DateTime($createdAt);
                } catch (\Exception $ex) {
                    continue;
                }
            }

            if ($createdAtDt >= $startLimit && $createdAtDt <= $endLimit) {
                $key = $row['event_type'];
                if (!isset($aggregated[$key])) {
                    $aggregated[$key] = [
                        'event_type' => $row['event_type'],
                        'event_count' => 0
                    ];
                }
                $aggregated[$key]['event_count']++;
            }
        }

        return array_values($aggregated);
    }

    public function getPageviewsOverTime(string $startDate, string $endDate): array {
        if (!$this->session) {
            return [];
        }

        $dates = $this->getDateRangeList($startDate, $endDate);
        if (empty($dates)) {
            return [];
        }

        $datesPlaceholder = implode(', ', array_fill(0, count($dates), '?'));
        $cql = "SELECT date_only, created_at FROM db_telemetry_nosql.pageviews WHERE date_only IN ({$datesPlaceholder})";
        
        try {
            $stmt = $this->session->prepare($cql);
            $rows = $this->session->execute($stmt, $dates)->asRowsResult();
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Cassandra pageviews query failed", ['exception' => $e->getMessage()]);
            return [];
        }

        $aggregated = [];
        $startLimit = new \DateTime($startDate);
        $endLimit = new \DateTime($endDate);

        foreach ($rows as $row) {
            $createdAt = $row['created_at'];
            if ($createdAt instanceof \DateTime) {
                $createdAtDt = $createdAt;
            } else {
                try {
                    $createdAtDt = new \DateTime($createdAt);
                } catch (\Exception $ex) {
                    continue;
                }
            }

            if ($createdAtDt >= $startLimit && $createdAtDt <= $endLimit) {
                $key = $row['date_only'];
                if (!isset($aggregated[$key])) {
                    $aggregated[$key] = [
                        'date' => $row['date_only'],
                        'count' => 0
                    ];
                }
                $aggregated[$key]['count']++;
            }
        }

        $result = array_values($aggregated);

        usort($result, function($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return $result;
    }

    public function getAuthEventsOverTime(string $startDate, string $endDate, string $eventType = 'login_success'): array {
        if (!$this->session) {
            return [];
        }

        $dates = $this->getDateRangeList($startDate, $endDate);
        if (empty($dates)) {
            return [];
        }

        $datesPlaceholder = implode(', ', array_fill(0, count($dates), '?'));
        $cql = "SELECT date_only, event_type, created_at FROM db_telemetry_nosql.auth_events WHERE date_only IN ({$datesPlaceholder})";
        
        try {
            $stmt = $this->session->prepare($cql);
            $rows = $this->session->execute($stmt, $dates)->asRowsResult();
        } catch (\Exception $e) {
            \App\Core\System\Logger::error("Cassandra auth_events query failed", ['exception' => $e->getMessage()]);
            return [];
        }

        $aggregated = [];
        $startLimit = new \DateTime($startDate);
        $endLimit = new \DateTime($endDate);

        foreach ($rows as $row) {
            $createdAt = $row['created_at'];
            if ($createdAt instanceof \DateTime) {
                $createdAtDt = $createdAt;
            } else {
                try {
                    $createdAtDt = new \DateTime($createdAt);
                } catch (\Exception $ex) {
                    continue;
                }
            }

            if ($createdAtDt >= $startLimit && $createdAtDt <= $endLimit && $row['event_type'] === $eventType) {
                $key = $row['date_only'];
                if (!isset($aggregated[$key])) {
                    $aggregated[$key] = [
                        'date' => $row['date_only'],
                        'count' => 0
                    ];
                }
                $aggregated[$key]['count']++;
            }
        }

        $result = array_values($aggregated);

        usort($result, function($a, $b) {
            return strcmp($a['date'], $b['date']);
        });

        return $result;
    }
}
?>