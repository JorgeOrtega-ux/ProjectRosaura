<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Helpers\EnvLoader;
use App\Config\Search\TypesenseManager;

EnvLoader::load(__DIR__);

$manager = new TypesenseManager();
$client = $manager->getClient();

try {
    $client->collections['canvases']->delete();
    echo "Collection 'canvases' deleted.\n";
} catch (Exception $e) {
    echo "Collection not found or couldn't delete: " . $e->getMessage() . "\n";
}

$schema = [
    'name' => 'canvases',
    'fields' => [
        ['name' => 'uuid', 'type' => 'string'],
        ['name' => 'name', 'type' => 'string'],
        ['name' => 'owner_id', 'type' => 'int32', 'optional' => true],
        ['name' => 'privacy', 'type' => 'string', 'facet' => true],
        ['name' => 'is_official', 'type' => 'int32', 'facet' => true, 'optional' => true],
        ['name' => 'created_at', 'type' => 'int64'],
    ],
    'default_sorting_field' => 'created_at'
];

try {
    $client->collections->create($schema);
    echo "Collection 'canvases' created successfully.\n";
} catch (Exception $e) {
    echo "Failed to create collection: " . $e->getMessage() . "\n";
}

?>
