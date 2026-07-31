import { DesignNetworkConnection } from './DesignNetworkConnection.js';
import { DesignNetworkCanvasState } from './DesignNetworkCanvasState.js';
import { DesignNetworkOperations } from './DesignNetworkOperations.js';

export const DesignNetwork = Object.assign(
    {},
    DesignNetworkConnection,
    DesignNetworkCanvasState,
    DesignNetworkOperations
);