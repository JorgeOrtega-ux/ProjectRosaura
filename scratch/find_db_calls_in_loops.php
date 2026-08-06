<?php

$keywords = [
    '->prepare',
    '->execute',
    '->query',
    'new DatabaseManager',
    'new CassandraManager',
    '->getConnection',
    '->getSession'
];

function find_matching_brace($text, $start_index) {
    $brace_count = 0;
    $in_string = false;
    $string_char = null;
    $escaped = false;
    
    $len = strlen($text);
    for ($i = $start_index; $i < $len; $i++) {
        $char = $text[$i];
        
        if ($escaped) {
            $escaped = false;
            continue;
        }
        
        if ($char === '\\') {
            $escaped = true;
            continue;
        }
        
        if ($char === '"' || $char === "'") {
            if (!$in_string) {
                $in_string = true;
                $string_char = $char;
            } elseif ($string_char === $char) {
                $in_string = false;
                $string_char = null;
            }
        }
        
        if (!$in_string) {
            if ($char === '{') {
                $brace_count++;
            } elseif ($char === '}') {
                $brace_count--;
                if ($brace_count === 0) {
                    return $i;
                }
            }
        }
    }
    return -1;
}

function analyze_php_file($filepath, $keywords) {
    $content = @file_get_contents($filepath);
    if ($content === false) return [];
    
    // Remove multi-line comments
    $content_clean = preg_replace('!/\*.*?\*/!s', '', $content);
    
    // Remove single-line comments
    $lines = explode("\n", $content_clean);
    foreach ($lines as $idx => $line) {
        if (strpos($line, '//') !== false) {
            $parts = explode('//', $line);
            $lines[$idx] = $parts[0];
        }
    }
    $content_clean = implode("\n", $lines);
    
    $results = [];
    
    // Find loop occurrences
    $pattern = '/\b(foreach|for|while)\s*\(/i';
    if (preg_match_all($pattern, $content_clean, $matches, PREG_OFFSET_CAPTURE)) {
        foreach ($matches[0] as $match) {
            $loop_keyword = $match[0];
            $start_pos = $match[1];
            
            // Line number
            $line_num = substr_count(substr($content_clean, 0, $start_pos), "\n") + 1;
            
            $search_area = substr($content_clean, $start_pos, 500);
            $brace_pos = strpos($search_area, '{');
            $colon_pos = strpos($search_area, ':');
            $semicolon_pos = strpos($search_area, ';');
            
            $loop_body = '';
            $end_line_num = $line_num;
            
            if ($semicolon_pos !== false && ($brace_pos === false || $semicolon_pos < $brace_pos) && ($colon_pos === false || $semicolon_pos < $colon_pos)) {
                $loop_body = substr($search_area, 0, $semicolon_pos + 1);
            } elseif ($brace_pos !== false) {
                $open_brace_index = $start_pos + $brace_pos;
                $close_brace_index = find_matching_brace($content_clean, $open_brace_index);
                if ($close_brace_index !== -1) {
                    $loop_body = substr($content_clean, $open_brace_index, $close_brace_index - $open_brace_index + 1);
                    $end_line_num = substr_count(substr($content_clean, 0, $close_brace_index), "\n") + 1;
                } else {
                    $loop_body = substr($content_clean, $open_brace_index, 500);
                    $end_line_num = $line_num + 10;
                }
            } elseif ($colon_pos !== false) {
                // Colon syntax
                $end_keyword = 'end' . trim(str_replace('(', '', strtolower($loop_keyword)));
                $end_pos = strpos(strtolower($content_clean), $end_keyword, $start_pos);
                if ($end_pos !== false) {
                    $loop_body = substr($content_clean, $start_pos, $end_pos - $start_pos + strlen($end_keyword));
                    $end_line_num = substr_count(substr($content_clean, 0, $end_pos), "\n") + 1;
                } else {
                    $loop_body = substr($content_clean, $start_pos, 500);
                    $end_line_num = $line_num + 10;
                }
            } else {
                continue;
            }
            
            $found_keywords = [];
            foreach ($keywords as $kw) {
                if (strpos($loop_body, $kw) !== false) {
                    $found_keywords[] = $kw;
                }
            }
            
            if (!empty($found_keywords)) {
                $results[] = [
                    'keyword' => trim(str_replace('(', '', $loop_keyword)),
                    'line' => $line_num,
                    'end_line' => $end_line_num,
                    'db_calls' => $found_keywords,
                    'snippet' => strlen($loop_body) > 200 ? substr($loop_body, 0, 200) . '...' : $loop_body
                ];
            }
        }
    }
    
    return $results;
}

function run_scan($target_dir, $keywords) {
    $all_results = [];
    
    $directory = new RecursiveDirectoryIterator($target_dir);
    $iterator = new RecursiveIteratorIterator($directory);
    
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'php') {
            $filepath = $file->getRealPath();
            if (strpos($filepath, 'vendor') !== false || strpos($filepath, '.git') !== false || strpos($filepath, 'storage') !== false) {
                continue;
            }
            $res = analyze_php_file($filepath, $keywords);
            if (!empty($res)) {
                $rel_path = str_replace($target_dir . DIRECTORY_SEPARATOR, '', $filepath);
                $all_results[$rel_path] = $res;
            }
        }
    }
    
    return $all_results;
}

$project_root = "/var/www/html";
echo "Scanning directory: $project_root\n";
$results = run_scan($project_root, $keywords);

$out_file = __DIR__ . DIRECTORY_SEPARATOR . 'db_scan_results.json';
file_put_contents($out_file, json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

$total_loops = 0;
foreach ($results as $file => $loops) {
    $total_loops += count($loops);
}

echo "Scan finished. Found $total_loops loops with database queries in " . count($results) . " files.\n";
echo "Results written to: $out_file\n";
