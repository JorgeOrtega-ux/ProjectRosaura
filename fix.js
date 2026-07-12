const fs = require('fs');
const file = 'F:\\htdocs\\ProjectRosaura\\public\\assets\\css\\components\\components.css';
let content = fs.readFileSync(file, 'utf8');

const startStr = '.component-snapshot-card {';
const endStr = '.component-wrapper[data-ref="design-wrapper"],';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);
    
    const newCss = `.component-snapshot-card {
    height: 180px;
    background-color: #e9ecef;
    border-radius: 12px;
    position: relative;
    outline: 2px solid transparent;
    outline-offset: 0px;
    transition: outline 0.2s ease, outline-offset 0.2s ease, transform 0.2s ease;
    cursor: pointer;
    text-decoration: none;
}

.component-snapshot-card::after {
    content: '';
    position: absolute;
    inset: 0;
    box-shadow: inset 0px -70px 50px -20px rgba(0, 0, 0, 0.7);
    pointer-events: none;
    z-index: 2; 
    border-radius: inherit; 
}

.component-snapshot-card:hover {
    outline: 2px solid var(--text-primary, #000000);
    outline-offset: 2px;
}

.component-snapshot-card__image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
    z-index: 1; 
    pointer-events: none;
    border-radius: inherit; 
}

.component-snapshot-link {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    padding: 20px;
    text-decoration: none;
    z-index: 10; 
    border-radius: inherit;
}

.component-snapshot-title {
    margin: 0; 
    color: #ffffff; 
    font-size: 1.25rem; 
    font-family: inherit;
    text-shadow: 0px 2px 4px rgba(0,0,0,0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

.component-snapshot-skeleton {
    height: 180px;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: loadingSkeleton 1.5s infinite;
}

@keyframes loadingSkeleton {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

.component-snapshot-actions-wrapper {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 20; 
    width: auto;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease;
}

.component-snapshot-card:hover .component-snapshot-actions-wrapper,
.component-snapshot-actions-wrapper:has(.component-module.active) {
    opacity: 1;
    visibility: visible;
}

.component-snapshot-actions {
    background-color: var(--bg-surface, #ffffff);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-card, 0 2px 8px rgba(0,0,0,0.15));
    padding: 2px; 
}

`;

    fs.writeFileSync(file, before + newCss + after);
    console.log("Successfully fixed CSS file.");
} else {
    console.log("Indices not found.");
}
