import { colorToAbgr, abgrToHex, getBresenhamLine } from './interactions/InteractionHelpers.js?v=34';
import { InteractionEvents } from './interactions/InteractionEvents.js?v=34';
import { InteractionPointer } from './interactions/InteractionPointer.js?v=34';
import { InteractionSelection } from './interactions/InteractionSelection.js?v=34';
import { InteractionDrawingTools } from './interactions/InteractionDrawingTools.js?v=34';
import { InteractionShapesText } from './interactions/InteractionShapesText.js?v=34';
import { InteractionOwnerTools } from './interactions/InteractionOwnerTools.js?v=34';
import { InteractionHistoryColors } from './interactions/InteractionHistoryColors.js?v=34';

export {
    colorToAbgr,
    abgrToHex,
    getBresenhamLine,
    InteractionEvents,
    InteractionPointer,
    InteractionSelection,
    InteractionDrawingTools,
    InteractionShapesText,
    InteractionOwnerTools,
    InteractionHistoryColors
};

export const DesignInteractions = Object.assign(
    {},
    InteractionEvents,
    InteractionPointer,
    InteractionSelection,
    InteractionDrawingTools,
    InteractionShapesText,
    InteractionOwnerTools,
    InteractionHistoryColors
);