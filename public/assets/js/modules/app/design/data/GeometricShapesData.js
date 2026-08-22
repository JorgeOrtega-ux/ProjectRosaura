const GEOMETRIC_SHAPES = [
    {
        id: 'line',
        name_key: 'shape_line',
        file_outline: 'line.svg',
        file_fill: 'line.svg',
        supports_fill: false
    },
    {
        id: 'rectangle',
        name_key: 'shape_rectangle',
        file_outline: 'rectangle.svg',
        file_fill: 'rectangle_fill.svg',
        supports_fill: true
    },
    {
        id: 'circle',
        name_key: 'shape_circle',
        file_outline: 'circle.svg',
        file_fill: 'circle_fill.svg',
        supports_fill: true
    },
    {
        id: 'triangle',
        name_key: 'shape_triangle',
        file_outline: 'triangle.svg',
        file_fill: 'triangle_fill.svg',
        supports_fill: true
    },
    {
        id: 'diamond',
        name_key: 'shape_diamond',
        file_outline: 'diamond.svg',
        file_fill: 'diamond_fill.svg',
        supports_fill: true
    }
];

export function getGeometricShapesList() {
    const basePath = window.AppBasePath || '';
    return GEOMETRIC_SHAPES.map(item => ({
        id: item.id,
        nameKey: item.name_key,
        supportsFill: item.supports_fill,
        svgOutline: `${basePath}/assets/img/shapes/${item.file_outline}`,
        svgFill: `${basePath}/assets/img/shapes/${item.file_fill}`
    }));
}

export function getGeometricShapeById(id) {
    const list = getGeometricShapesList();
    return list.find(s => s.id === id) || null;
}
