/**
 * ============================================================================
 * ProjectRosaura UI Engine (UiEngine) v3.0.0
 * Proprietary Dynamic Positioning & Collision Detection Engine
 * ============================================================================
 * High-performance, multi-axis spatial layout coordinator, smart auto-flipping,
 * boundary collision detection, and viewport containment system for floating UI
 * components (dropdowns, tooltips, flyout menus, and contextual overlays).
 *
 * Copyright (c) ProjectRosaura. All rights reserved.
 * ============================================================================
 */

(function (global, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(exports);
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory);
  } else {
    global = typeof globalThis !== 'undefined' ? globalThis : global || self;
    factory((global.UiEngine = {}));
  }
}(this, (function (exports) {
  'use strict';

  /* ==========================================================================
     1. MATHEMATICAL CONSTANTS & GEOMETRY HELPERS
     ========================================================================== */

  const { max, min, round } = Math;

  const TOP = 'top';
  const BOTTOM = 'bottom';
  const RIGHT = 'right';
  const LEFT = 'left';
  const AUTO = 'auto';
  const START = 'start';
  const END = 'end';

  const CLIPPING_PARENTS = 'clippingParents';
  const VIEWPORT = 'viewport';
  const FLOATING_CONTEXT = 'floating';
  const REFERENCE_CONTEXT = 'reference';

  const BASE_PLACEMENTS = [TOP, BOTTOM, RIGHT, LEFT];

  const VARIATION_PLACEMENTS = BASE_PLACEMENTS.reduce((acc, placement) => {
    return acc.concat([`${placement}-${START}`, `${placement}-${END}`]);
  }, []);

  const ALL_PLACEMENTS = [...BASE_PLACEMENTS, AUTO].reduce((acc, placement) => {
    return acc.concat([placement, `${placement}-${START}`, `${placement}-${END}`]);
  }, []);

  const PIPELINE_PHASES = [
    'beforeRead',
    'read',
    'afterRead',
    'beforeMain',
    'main',
    'afterMain',
    'beforeWrite',
    'write',
    'afterWrite'
  ];

  const OPPOSITE_SIDES = {
    [LEFT]: RIGHT,
    [RIGHT]: LEFT,
    [BOTTOM]: TOP,
    [TOP]: BOTTOM
  };

  const OPPOSITE_VARIATIONS = {
    [START]: END,
    [END]: START
  };

  const UNSET_SIDES = {
    [TOP]: 'auto',
    [RIGHT]: 'auto',
    [BOTTOM]: 'auto',
    [LEFT]: 'auto'
  };

  const PASSIVE_EVENT_OPTIONS = { passive: true };

  /* ==========================================================================
     2. DOM & ENVIRONMENT INTROSPECTION
     ========================================================================== */

  function getWindow(node) {
    if (node == null) {
      return window;
    }
    if (node.toString() !== '[object Window]') {
      const ownerDocument = node.ownerDocument;
      return ownerDocument ? ownerDocument.defaultView || window : window;
    }
    return node;
  }

  function isElement(node) {
    const OwnElement = getWindow(node).Element;
    return node instanceof OwnElement || node instanceof Element;
  }

  function isHTMLElement(node) {
    const OwnElement = getWindow(node).HTMLElement;
    return node instanceof OwnElement || node instanceof HTMLElement;
  }

  function isShadowRoot(node) {
    if (typeof ShadowRoot === 'undefined') {
      return false;
    }
    const OwnShadowRoot = getWindow(node).ShadowRoot;
    return node instanceof OwnShadowRoot || node instanceof ShadowRoot;
  }

  function areValidElements(...args) {
    return !args.some((element) => !(element && typeof element.getBoundingClientRect === 'function'));
  }

  function getNodeName(element) {
    return element ? (element.nodeName || '').toLowerCase() : null;
  }

  function getDocumentElement(element) {
    return ((isElement(element) ? element.ownerDocument : element.document) || window.document).documentElement;
  }

  function getComputedStyle(element) {
    return getWindow(element).getComputedStyle(element);
  }

  function getUAString() {
    const uaData = navigator.userAgentData;
    if (uaData && uaData.brands && Array.isArray(uaData.brands)) {
      return uaData.brands.map((item) => `${item.brand}/${item.version}`).join(' ');
    }
    return navigator.userAgent;
  }

  function isLayoutViewport() {
    return !/^((?!chrome|android).)*safari/i.test(getUAString());
  }

  function isTableElement(element) {
    return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
  }

  function isScrollParent(element) {
    const { overflow, overflowX, overflowY } = getComputedStyle(element);
    return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
  }

  function isElementScaled(element) {
    const rect = element.getBoundingClientRect();
    const scaleX = round(rect.width) / element.offsetWidth || 1;
    const scaleY = round(rect.height) / element.offsetHeight || 1;
    return scaleX !== 1 || scaleY !== 1;
  }

  function contains(parent, child) {
    const rootNode = child.getRootNode && child.getRootNode();
    if (parent.contains(child)) {
      return true;
    }
    if (rootNode && isShadowRoot(rootNode)) {
      let next = child;
      do {
        if (next && parent.isSameNode(next)) {
          return true;
        }
        next = next.parentNode || next.host;
      } while (next);
    }
    return false;
  }

  function getParentNode(element) {
    if (getNodeName(element) === 'html') {
      return element;
    }
    return (
      element.assignedSlot ||
      element.parentNode ||
      (isShadowRoot(element) ? element.host : null) ||
      getDocumentElement(element)
    );
  }

  function getScrollParent(node) {
    if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
      return node.ownerDocument.body;
    }
    if (isHTMLElement(node) && isScrollParent(node)) {
      return node;
    }
    return getScrollParent(getParentNode(node));
  }

  function listScrollParents(element, list = []) {
    const scrollParent = getScrollParent(element);
    const isBody = scrollParent === element.ownerDocument?.body;
    const win = getWindow(scrollParent);
    const target = isBody
      ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : [])
      : scrollParent;
    const updatedList = list.concat(target);
    return isBody ? updatedList : updatedList.concat(listScrollParents(getParentNode(target)));
  }

  /* ==========================================================================
     3. SPATIAL & BOUNDING BOX COMPUTATIONS
     ========================================================================== */

  function getWindowScroll(node) {
    const win = getWindow(node);
    return {
      scrollLeft: win.pageXOffset,
      scrollTop: win.pageYOffset
    };
  }

  function getHTMLElementScroll(element) {
    return {
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  }

  function getNodeScroll(node) {
    if (node === getWindow(node) || !isHTMLElement(node)) {
      return getWindowScroll(node);
    }
    return getHTMLElementScroll(node);
  }

  function getBoundingClientRect(element, includeScale = false, isFixedStrategy = false) {
    const clientRect = element.getBoundingClientRect();
    let scaleX = 1;
    let scaleY = 1;

    if (includeScale && isHTMLElement(element)) {
      scaleX = element.offsetWidth > 0 ? round(clientRect.width) / element.offsetWidth || 1 : 1;
      scaleY = element.offsetHeight > 0 ? round(clientRect.height) / element.offsetHeight || 1 : 1;
    }

    const { visualViewport } = isElement(element) ? getWindow(element) : window;
    const addVisualOffsets = !isLayoutViewport() && isFixedStrategy;
    const x = (clientRect.left + (addVisualOffsets && visualViewport ? visualViewport.offsetLeft : 0)) / scaleX;
    const y = (clientRect.top + (addVisualOffsets && visualViewport ? visualViewport.offsetTop : 0)) / scaleY;
    const width = clientRect.width / scaleX;
    const height = clientRect.height / scaleY;

    return {
      width,
      height,
      top: y,
      right: x + width,
      bottom: y + height,
      left: x,
      x,
      y
    };
  }

  function getWindowScrollBarX(element) {
    return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
  }

  function getTrueOffsetParent(element) {
    if (!isHTMLElement(element) || getComputedStyle(element).position === 'fixed') {
      return null;
    }
    return element.offsetParent;
  }

  function getContainingBlock(element) {
    const isFirefox = /firefox/i.test(getUAString());
    const isIE = /Trident/i.test(getUAString());

    if (isIE && isHTMLElement(element)) {
      const elementCss = getComputedStyle(element);
      if (elementCss.position === 'fixed') {
        return null;
      }
    }

    let currentNode = getParentNode(element);
    if (isShadowRoot(currentNode)) {
      currentNode = currentNode.host;
    }

    while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
      const css = getComputedStyle(currentNode);
      if (
        css.transform !== 'none' ||
        css.perspective !== 'none' ||
        css.contain === 'paint' ||
        ['transform', 'perspective'].indexOf(css.willChange) !== -1 ||
        (isFirefox && css.willChange === 'filter') ||
        (isFirefox && css.filter && css.filter !== 'none')
      ) {
        return currentNode;
      }
      currentNode = currentNode.parentNode;
    }
    return null;
  }

  function getOffsetParent(element) {
    const win = getWindow(element);
    let offsetParent = getTrueOffsetParent(element);

    while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
      offsetParent = getTrueOffsetParent(offsetParent);
    }

    if (
      offsetParent &&
      (getNodeName(offsetParent) === 'html' ||
        (getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static'))
    ) {
      return win;
    }

    return offsetParent || getContainingBlock(element) || win;
  }

  function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed = false) {
    const isOffsetParentAnElement = isHTMLElement(offsetParent);
    const offsetParentIsScaled = isHTMLElement(offsetParent) && isElementScaled(offsetParent);
    const documentElement = getDocumentElement(offsetParent);
    const rect = getBoundingClientRect(elementOrVirtualElement, offsetParentIsScaled, isFixed);
    let scroll = { scrollLeft: 0, scrollTop: 0 };
    let offsets = { x: 0, y: 0 };

    if (isOffsetParentAnElement || (!isOffsetParentAnElement && !isFixed)) {
      if (getNodeName(offsetParent) !== 'body' || isScrollParent(documentElement)) {
        scroll = getNodeScroll(offsetParent);
      }
      if (isHTMLElement(offsetParent)) {
        offsets = getBoundingClientRect(offsetParent, true);
        offsets.x += offsetParent.clientLeft;
        offsets.y += offsetParent.clientTop;
      } else if (documentElement) {
        offsets.x = getWindowScrollBarX(documentElement);
      }
    }

    return {
      x: rect.left + scroll.scrollLeft - offsets.x,
      y: rect.top + scroll.scrollTop - offsets.y,
      width: rect.width,
      height: rect.height
    };
  }

  function getLayoutRect(element) {
    const clientRect = getBoundingClientRect(element);
    let width = element.offsetWidth;
    let height = element.offsetHeight;

    if (Math.abs(clientRect.width - width) <= 1) {
      width = clientRect.width;
    }
    if (Math.abs(clientRect.height - height) <= 1) {
      height = clientRect.height;
    }

    return {
      x: element.offsetLeft,
      y: element.offsetTop,
      width,
      height
    };
  }

  function rectToClientRect(rect) {
    return {
      ...rect,
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height
    };
  }

  function getInnerBoundingClientRect(element, strategy) {
    const rect = getBoundingClientRect(element, false, strategy === 'fixed');
    rect.top = rect.top + element.clientTop;
    rect.left = rect.left + element.clientLeft;
    rect.bottom = rect.top + element.clientHeight;
    rect.right = rect.left + element.clientWidth;
    rect.width = element.clientWidth;
    rect.height = element.clientHeight;
    rect.x = rect.left;
    rect.y = rect.top;
    return rect;
  }

  function getViewportRect(element, strategy) {
    const win = getWindow(element);
    const html = getDocumentElement(element);
    const visualViewport = win.visualViewport;
    let width = html.clientWidth;
    let height = html.clientHeight;
    let x = 0;
    let y = 0;

    if (visualViewport) {
      width = visualViewport.width;
      height = visualViewport.height;
      const layoutViewport = isLayoutViewport();
      if (layoutViewport || (!layoutViewport && strategy === 'fixed')) {
        x = visualViewport.offsetLeft;
        y = visualViewport.offsetTop;
      }
    }

    return {
      width,
      height,
      x: x + getWindowScrollBarX(element),
      y
    };
  }

  function getDocumentRect(element) {
    const html = getDocumentElement(element);
    const winScroll = getWindowScroll(element);
    const body = element.ownerDocument?.body;
    const width = max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
    const height = max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
    let x = -winScroll.scrollLeft + getWindowScrollBarX(element);
    const y = -winScroll.scrollTop;

    if (getComputedStyle(body || html).direction === 'rtl') {
      x += max(html.clientWidth, body ? body.clientWidth : 0) - width;
    }

    return {
      width,
      height,
      x,
      y
    };
  }

  function getClientRectFromMixedType(element, clippingParent, strategy) {
    return clippingParent === VIEWPORT
      ? rectToClientRect(getViewportRect(element, strategy))
      : isElement(clippingParent)
      ? getInnerBoundingClientRect(clippingParent, strategy)
      : rectToClientRect(getDocumentRect(getDocumentElement(element)));
  }

  function getClippingParents(element) {
    const clippingParents = listScrollParents(getParentNode(element));
    const canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle(element).position) >= 0;
    const clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

    if (!isElement(clipperElement)) {
      return [];
    }

    return clippingParents.filter((clippingParent) => {
      return isElement(clippingParent) && contains(clippingParent, clipperElement) && getNodeName(clippingParent) !== 'body';
    });
  }

  function getClippingRect(element, boundary, rootBoundary, strategy) {
    const mainClippingParents = boundary === CLIPPING_PARENTS ? getClippingParents(element) : [].concat(boundary);
    const clippingParents = [].concat(mainClippingParents, [rootBoundary]);
    const firstClippingParent = clippingParents[0];
    const clippingRect = clippingParents.reduce((accRect, clippingParent) => {
      const rect = getClientRectFromMixedType(element, clippingParent, strategy);
      accRect.top = max(rect.top, accRect.top);
      accRect.right = min(rect.right, accRect.right);
      accRect.bottom = min(rect.bottom, accRect.bottom);
      accRect.left = max(rect.left, accRect.left);
      return accRect;
    }, getClientRectFromMixedType(element, firstClippingParent, strategy));

    clippingRect.width = clippingRect.right - clippingRect.left;
    clippingRect.height = clippingRect.bottom - clippingRect.top;
    clippingRect.x = clippingRect.left;
    clippingRect.y = clippingRect.top;
    return clippingRect;
  }

  /* ==========================================================================
     4. POSITIONS, OFFSETS & OVERFLOW ENGINE
     ========================================================================== */

  function getBasePlacement(placement) {
    return placement.split('-')[0];
  }

  function getVariation(placement) {
    return placement.split('-')[1];
  }

  function getMainAxisFromPlacement(placement) {
    return [TOP, BOTTOM].indexOf(placement) >= 0 ? 'x' : 'y';
  }

  function getAltAxis(axis) {
    return axis === 'x' ? 'y' : 'x';
  }

  function within(minValue, value, maxValue) {
    return max(minValue, min(value, maxValue));
  }

  function withinMaxClamp(minValue, value, maxValue) {
    const v = within(minValue, value, maxValue);
    return v > maxValue ? maxValue : v;
  }

  function getFreshSideObject() {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
  }

  function mergePaddingObject(paddingObject) {
    return { ...getFreshSideObject(), ...paddingObject };
  }

  function expandToHashMap(value, keys) {
    return keys.reduce((hashMap, key) => {
      hashMap[key] = value;
      return hashMap;
    }, {});
  }

  function computePositionOffsets({ reference, element, placement }) {
    const basePlacement = placement ? getBasePlacement(placement) : null;
    const variation = placement ? getVariation(placement) : null;
    const commonX = reference.x + reference.width / 2 - element.width / 2;
    const commonY = reference.y + reference.height / 2 - element.height / 2;
    let offsets;

    switch (basePlacement) {
      case TOP:
        offsets = {
          x: commonX,
          y: reference.y - element.height
        };
        break;
      case BOTTOM:
        offsets = {
          x: commonX,
          y: reference.y + reference.height
        };
        break;
      case RIGHT:
        offsets = {
          x: reference.x + reference.width,
          y: commonY
        };
        break;
      case LEFT:
        offsets = {
          x: reference.x - element.width,
          y: commonY
        };
        break;
      default:
        offsets = {
          x: reference.x,
          y: reference.y
        };
    }

    const mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

    if (mainAxis != null) {
      const len = mainAxis === 'y' ? 'height' : 'width';
      switch (variation) {
        case START:
          offsets[mainAxis] = offsets[mainAxis] - (reference[len] / 2 - element[len] / 2);
          break;
        case END:
          offsets[mainAxis] = offsets[mainAxis] + (reference[len] / 2 - element[len] / 2);
          break;
      }
    }

    return offsets;
  }

  function detectOverflow(state, options = {}) {
    const {
      placement = state.placement,
      strategy = state.strategy,
      boundary = CLIPPING_PARENTS,
      rootBoundary = VIEWPORT,
      elementContext = FLOATING_CONTEXT,
      altBoundary = false,
      padding = 0
    } = options;

    const paddingObject = mergePaddingObject(
      typeof padding !== 'number' ? padding : expandToHashMap(padding, BASE_PLACEMENTS)
    );
    const altContext = elementContext === FLOATING_CONTEXT ? REFERENCE_CONTEXT : FLOATING_CONTEXT;
    const targetRect = state.rects.floating || state.rects.target;
    const element = state.elements[altBoundary ? altContext : elementContext];
    const clippingClientRect = getClippingRect(
      isElement(element)
        ? element
        : element.contextElement || getDocumentElement(state.elements.floating || state.elements.target),
      boundary,
      rootBoundary,
      strategy
    );
    const referenceClientRect = getBoundingClientRect(state.elements.reference);
    const targetOffsets = computePositionOffsets({
      reference: referenceClientRect,
      element: targetRect,
      strategy: 'absolute',
      placement
    });
    const targetClientRect = rectToClientRect({ ...targetRect, ...targetOffsets });
    const elementClientRect = elementContext === FLOATING_CONTEXT ? targetClientRect : referenceClientRect;

    const overflowOffsets = {
      top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
      bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
      left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
      right: elementClientRect.right - clippingClientRect.right + paddingObject.right
    };
    const offsetData = state.modifiersData.offset;

    if (elementContext === FLOATING_CONTEXT && offsetData) {
      const offset = offsetData[placement];
      Object.keys(overflowOffsets).forEach((key) => {
        const multiply = [RIGHT, BOTTOM].indexOf(key) >= 0 ? 1 : -1;
        const axis = [TOP, BOTTOM].indexOf(key) >= 0 ? 'y' : 'x';
        overflowOffsets[key] += offset[axis] * multiply;
      });
    }

    return overflowOffsets;
  }

  function getOppositePlacement(placement) {
    return placement.replace(/left|right|bottom|top/g, (matched) => OPPOSITE_SIDES[matched]);
  }

  function getOppositeVariationPlacement(placement) {
    return placement.replace(/start|end/g, (matched) => OPPOSITE_VARIATIONS[matched]);
  }

  function computeAutoPlacement(state, options = {}) {
    const {
      placement,
      boundary,
      rootBoundary,
      padding,
      flipVariations,
      allowedAutoPlacements = ALL_PLACEMENTS
    } = options;

    const variation = getVariation(placement);
    const placementsSubset = variation
      ? flipVariations
        ? VARIATION_PLACEMENTS
        : VARIATION_PLACEMENTS.filter((p) => getVariation(p) === variation)
      : BASE_PLACEMENTS;

    let allowedPlacements = placementsSubset.filter((p) => allowedAutoPlacements.indexOf(p) >= 0);
    if (allowedPlacements.length === 0) {
      allowedPlacements = placementsSubset;
    }

    const overflows = allowedPlacements.reduce((acc, p) => {
      acc[p] = detectOverflow(state, {
        placement: p,
        boundary,
        rootBoundary,
        padding
      })[getBasePlacement(p)];
      return acc;
    }, {});

    return Object.keys(overflows).sort((a, b) => overflows[a] - overflows[b]);
  }

  function getExpandedFallbackPlacements(placement) {
    if (getBasePlacement(placement) === AUTO) {
      return [];
    }
    const oppositePlacement = getOppositePlacement(placement);
    return [
      getOppositeVariationPlacement(placement),
      oppositePlacement,
      getOppositeVariationPlacement(oppositePlacement)
    ];
  }

  function roundOffsetsByDPR({ x, y }, win) {
    const dpr = win.devicePixelRatio || 1;
    return {
      x: round(x * dpr) / dpr || 0,
      y: round(y * dpr) / dpr || 0
    };
  }

  function distanceAndSkiddingToXY(placement, rects, offset) {
    const basePlacement = getBasePlacement(placement);
    const invertDistance = [LEFT, TOP].indexOf(basePlacement) >= 0 ? -1 : 1;
    const computedOffset = typeof offset === 'function' ? offset({ ...rects, placement }) : offset;
    let [skidding, distance] = computedOffset || [0, 0];

    skidding = skidding || 0;
    distance = (distance || 0) * invertDistance;

    return [LEFT, RIGHT].indexOf(basePlacement) >= 0
      ? { x: distance, y: skidding }
      : { x: skidding, y: distance };
  }

  /* ==========================================================================
     5. BUILT-IN PIPELINE MODIFIERS
     ========================================================================== */

  // Modifier: Event Listeners (Scroll & Resize auto-updating)
  const eventListenersModifier = {
    name: 'eventListeners',
    enabled: true,
    phase: 'write',
    fn() {},
    effect({ state, instance, options }) {
      const { scroll = true, resize = true } = options;
      const win = getWindow(state.elements.floating || state.elements.target);
      const scrollParents = [].concat(
        state.scrollParents.reference,
        state.scrollParents.floating || state.scrollParents.target || []
      );

      if (scroll) {
        scrollParents.forEach((parent) => {
          parent.addEventListener('scroll', instance.update, PASSIVE_EVENT_OPTIONS);
        });
      }

      if (resize) {
        win.addEventListener('resize', instance.update, PASSIVE_EVENT_OPTIONS);
      }

      return () => {
        if (scroll) {
          scrollParents.forEach((parent) => {
            parent.removeEventListener('scroll', instance.update, PASSIVE_EVENT_OPTIONS);
          });
        }
        if (resize) {
          win.removeEventListener('resize', instance.update, PASSIVE_EVENT_OPTIONS);
        }
      };
    },
    data: {}
  };

  // Modifier: Offsets Computation
  const engineOffsetsModifier = {
    name: 'engineOffsets',
    enabled: true,
    phase: 'read',
    fn({ state, name }) {
      const offsets = computePositionOffsets({
        reference: state.rects.reference,
        element: state.rects.floating || state.rects.target,
        strategy: 'absolute',
        placement: state.placement
      });
      state.modifiersData[name] = offsets;
      state.modifiersData.offsets = offsets;
    },
    data: {}
  };

  // Modifier: Custom Offset / Skidding
  const offsetModifier = {
    name: 'offset',
    enabled: true,
    phase: 'main',
    requires: ['engineOffsets'],
    requiresIfExists: ['offsets'],
    fn({ state, options, name }) {
      const { offset = [0, 0] } = options;
      const data = ALL_PLACEMENTS.reduce((acc, placement) => {
        acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
        return acc;
      }, {});

      const { x, y } = data[state.placement];
      const currentOffsets = state.modifiersData.engineOffsets || state.modifiersData.offsets;

      if (currentOffsets != null) {
        currentOffsets.x += x;
        currentOffsets.y += y;
      }

      state.modifiersData[name] = data;
    }
  };

  // Modifier: Dynamic Smart Flipping
  const flipModifier = {
    name: 'flip',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['offset'],
    data: { _skip: false },
    fn({ state, options, name }) {
      if (state.modifiersData[name]._skip) {
        return;
      }

      const {
        mainAxis: checkMainAxis = true,
        altAxis: checkAltAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        padding,
        boundary,
        rootBoundary,
        altBoundary,
        flipVariations = true,
        allowedAutoPlacements
      } = options;

      const preferredPlacement = state.options.placement;
      const basePlacement = getBasePlacement(preferredPlacement);
      const isBasePlacement = basePlacement === preferredPlacement;
      const fallbackPlacements =
        specifiedFallbackPlacements ||
        (isBasePlacement || !flipVariations
          ? [getOppositePlacement(preferredPlacement)]
          : getExpandedFallbackPlacements(preferredPlacement));

      const placementsList = [preferredPlacement, ...fallbackPlacements].reduce((acc, placement) => {
        return acc.concat(
          getBasePlacement(placement) === AUTO
            ? computeAutoPlacement(state, {
                placement,
                boundary,
                rootBoundary,
                padding,
                flipVariations,
                allowedAutoPlacements
              })
            : placement
        );
      }, []);

      const referenceRect = state.rects.reference;
      const targetRect = state.rects.floating || state.rects.target;
      const checksMap = new Map();
      let makeFallbackChecks = true;
      let firstFittingPlacement = placementsList[0];

      for (let i = 0; i < placementsList.length; i++) {
        const placement = placementsList[i];
        const currentBasePlacement = getBasePlacement(placement);
        const isStartVariation = getVariation(placement) === START;
        const isVertical = [TOP, BOTTOM].indexOf(currentBasePlacement) >= 0;
        const len = isVertical ? 'width' : 'height';
        const overflow = detectOverflow(state, {
          placement,
          boundary,
          rootBoundary,
          altBoundary,
          padding
        });

        let mainVariationSide = isVertical
          ? isStartVariation
            ? RIGHT
            : LEFT
          : isStartVariation
          ? BOTTOM
          : TOP;

        if (referenceRect[len] > targetRect[len]) {
          mainVariationSide = getOppositePlacement(mainVariationSide);
        }

        const altVariationSide = getOppositePlacement(mainVariationSide);
        const checks = [];

        if (checkMainAxis) {
          checks.push(overflow[currentBasePlacement] <= 0);
        }
        if (checkAltAxis) {
          checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
        }

        if (checks.every((check) => check)) {
          firstFittingPlacement = placement;
          makeFallbackChecks = false;
          break;
        }

        checksMap.set(placement, checks);
      }

      if (makeFallbackChecks) {
        const numberOfChecks = flipVariations ? 3 : 1;
        for (let i = numberOfChecks; i > 0; i--) {
          const fittingPlacement = placementsList.find((placement) => {
            const checks = checksMap.get(placement);
            if (checks) {
              return checks.slice(0, i).every((check) => check);
            }
            return false;
          });
          if (fittingPlacement) {
            firstFittingPlacement = fittingPlacement;
            break;
          }
        }
      }

      if (state.placement !== firstFittingPlacement) {
        state.modifiersData[name]._skip = true;
        state.placement = firstFittingPlacement;
        state.reset = true;
      }
    }
  };

  // Modifier: Prevent Viewport & Container Overflow
  const preventOverflowModifier = {
    name: 'preventOverflow',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['offset'],
    fn({ state, options, name }) {
      const {
        mainAxis: checkMainAxis = true,
        altAxis: checkAltAxis = false,
        boundary,
        rootBoundary,
        altBoundary,
        padding,
        tether = true,
        tetherOffset = 0
      } = options;

      const overflow = detectOverflow(state, {
        boundary,
        rootBoundary,
        padding,
        altBoundary
      });
      const basePlacement = getBasePlacement(state.placement);
      const variation = getVariation(state.placement);
      const isBasePlacement = !variation;
      const mainAxis = getMainAxisFromPlacement(basePlacement);
      const altAxis = getAltAxis(mainAxis);
      const targetOffsets = state.modifiersData.engineOffsets || state.modifiersData.offsets;
      const referenceRect = state.rects.reference;
      const targetRect = state.rects.floating || state.rects.target;

      const tetherOffsetValue =
        typeof tetherOffset === 'function' ? tetherOffset({ ...state.rects, placement: state.placement }) : tetherOffset;
      const normalizedTetherOffsetValue =
        typeof tetherOffsetValue === 'number'
          ? { mainAxis: tetherOffsetValue, altAxis: tetherOffsetValue }
          : { mainAxis: 0, altAxis: 0, ...tetherOffsetValue };

      const offsetModifierState = state.modifiersData.offset ? state.modifiersData.offset[state.placement] : null;
      const data = { x: 0, y: 0 };

      if (!targetOffsets) {
        return;
      }

      if (checkMainAxis) {
        const mainSide = mainAxis === 'y' ? TOP : LEFT;
        const altSide = mainAxis === 'y' ? BOTTOM : RIGHT;
        const len = mainAxis === 'y' ? 'height' : 'width';
        const offset = targetOffsets[mainAxis];
        const minVal = offset + overflow[mainSide];
        const maxVal = offset - overflow[altSide];
        const additive = tether ? -targetRect[len] / 2 : 0;
        const minLen = variation === START ? referenceRect[len] : targetRect[len];
        const maxLen = variation === START ? -targetRect[len] : -referenceRect[len];

        const arrowElement = state.elements.arrow;
        const arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : { width: 0, height: 0 };
        const arrowPaddingObject = state.modifiersData['arrow#persistent']
          ? state.modifiersData['arrow#persistent'].padding
          : getFreshSideObject();
        const arrowPaddingMin = arrowPaddingObject[mainSide];
        const arrowPaddingMax = arrowPaddingObject[altSide];

        const arrowLen = within(0, referenceRect[len], arrowRect[len]);
        const minOffset = isBasePlacement
          ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis
          : minLen - arrowLen - arrowPaddingMin - normalizedTetherOffsetValue.mainAxis;
        const maxOffset = isBasePlacement
          ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis
          : maxLen + arrowLen + arrowPaddingMax + normalizedTetherOffsetValue.mainAxis;

        const arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
        const clientOffset = arrowOffsetParent
          ? mainAxis === 'y'
            ? arrowOffsetParent.clientTop || 0
            : arrowOffsetParent.clientLeft || 0
          : 0;
        const offsetModifierValue = offsetModifierState?.[mainAxis] ?? 0;
        const tetherMin = offset + minOffset - offsetModifierValue - clientOffset;
        const tetherMax = offset + maxOffset - offsetModifierValue;
        const preventedOffset = within(
          tether ? min(minVal, tetherMin) : minVal,
          offset,
          tether ? max(maxVal, tetherMax) : maxVal
        );

        targetOffsets[mainAxis] = preventedOffset;
        data[mainAxis] = preventedOffset - offset;
      }

      if (checkAltAxis) {
        const mainSide = mainAxis === 'x' ? TOP : LEFT;
        const altSide = mainAxis === 'x' ? BOTTOM : RIGHT;
        const offset = targetOffsets[altAxis];
        const len = altAxis === 'y' ? 'height' : 'width';
        const minVal = offset + overflow[mainSide];
        const maxVal = offset - overflow[altSide];
        const isOriginSide = [TOP, LEFT].indexOf(basePlacement) !== -1;
        const offsetModifierValue = offsetModifierState?.[altAxis] ?? 0;
        const tetherMin = isOriginSide
          ? minVal
          : offset - referenceRect[len] - targetRect[len] - offsetModifierValue + normalizedTetherOffsetValue.altAxis;
        const tetherMax = isOriginSide
          ? offset + referenceRect[len] + targetRect[len] - offsetModifierValue - normalizedTetherOffsetValue.altAxis
          : maxVal;
        const preventedOffset =
          tether && isOriginSide
            ? withinMaxClamp(tetherMin, offset, tetherMax)
            : within(tether ? tetherMin : minVal, offset, tether ? tetherMax : maxVal);

        targetOffsets[altAxis] = preventedOffset;
        data[altAxis] = preventedOffset - offset;
      }

      state.modifiersData[name] = data;
    }
  };

  // Modifier: Arrow Element Positioning
  const toPaddingObject = (padding, state) => {
    const resolvedPadding = typeof padding === 'function' ? padding({ ...state.rects, placement: state.placement }) : padding;
    return mergePaddingObject(
      typeof resolvedPadding !== 'number' ? resolvedPadding : expandToHashMap(resolvedPadding, BASE_PLACEMENTS)
    );
  };

  const arrowModifier = {
    name: 'arrow',
    enabled: true,
    phase: 'main',
    requires: ['engineOffsets'],
    requiresIfExists: ['offsets', 'preventOverflow'],
    fn({ state, name, options }) {
      const arrowElement = state.elements.arrow;
      const targetOffsets = state.modifiersData.engineOffsets || state.modifiersData.offsets;
      const basePlacement = getBasePlacement(state.placement);
      const axis = getMainAxisFromPlacement(basePlacement);
      const isVertical = [LEFT, RIGHT].indexOf(basePlacement) >= 0;
      const len = isVertical ? 'height' : 'width';

      if (!arrowElement || !targetOffsets) {
        return;
      }

      const paddingObject = toPaddingObject(options.padding, state);
      const arrowRect = getLayoutRect(arrowElement);
      const minProp = axis === 'y' ? TOP : LEFT;
      const maxProp = axis === 'y' ? BOTTOM : RIGHT;
      const endDiff =
        state.rects.reference[len] + state.rects.reference[axis] - targetOffsets[axis] - (state.rects.floating || state.rects.target)[len];
      const startDiff = targetOffsets[axis] - state.rects.reference[axis];
      const arrowOffsetParent = getOffsetParent(arrowElement);
      const clientSize = arrowOffsetParent
        ? axis === 'y'
          ? arrowOffsetParent.clientHeight || 0
          : arrowOffsetParent.clientWidth || 0
        : 0;
      const centerToReference = endDiff / 2 - startDiff / 2;

      const minVal = paddingObject[minProp];
      const maxVal = clientSize - arrowRect[len] - paddingObject[maxProp];
      const center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
      const offset = within(minVal, center, maxVal);

      state.modifiersData[name] = {
        [axis]: offset,
        centerOffset: offset - center
      };
    },
    effect({ state, options }) {
      const { element: arrowElementOption = '[data-ui-arrow]' } = options;
      if (arrowElementOption == null) {
        return;
      }

      const floatingEl = state.elements.floating || state.elements.target;
      let resolvedArrow = arrowElementOption;

      if (typeof resolvedArrow === 'string') {
        resolvedArrow = floatingEl.querySelector(resolvedArrow);
        if (!resolvedArrow) {
          return;
        }
      }

      if (!contains(floatingEl, resolvedArrow)) {
        return;
      }

      state.elements.arrow = resolvedArrow;
    }
  };

  // Modifier: Visibility & Viewport Escape Clipping (Hide)
  function getSideOffsets(overflow, rect, preventedOffsets = { x: 0, y: 0 }) {
    return {
      top: overflow.top - rect.height - preventedOffsets.y,
      right: overflow.right - rect.width + preventedOffsets.x,
      bottom: overflow.bottom - rect.height + preventedOffsets.y,
      left: overflow.left - rect.width - preventedOffsets.x
    };
  }

  function isAnySideFullyClipped(overflow) {
    return [TOP, RIGHT, BOTTOM, LEFT].some((side) => overflow[side] >= 0);
  }

  const hideModifier = {
    name: 'hide',
    enabled: true,
    phase: 'main',
    requiresIfExists: ['preventOverflow'],
    fn({ state, name }) {
      const referenceRect = state.rects.reference;
      const targetRect = state.rects.floating || state.rects.target;
      const preventedOffsets = state.modifiersData.preventOverflow;
      const referenceOverflow = detectOverflow(state, { elementContext: 'reference' });
      const targetAltOverflow = detectOverflow(state, { altBoundary: true });

      const referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
      const engineEscapeOffsets = getSideOffsets(targetAltOverflow, targetRect, preventedOffsets);
      const isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
      const hasEngineEscaped = isAnySideFullyClipped(engineEscapeOffsets);

      state.modifiersData[name] = {
        referenceClippingOffsets,
        engineEscapeOffsets,
        isReferenceHidden,
        hasEngineEscaped
      };

      const floatingAttrs = state.attributes.floating || state.attributes.target || {};
      const updatedAttrs = {
        ...floatingAttrs,
        'data-ui-reference-hidden': isReferenceHidden,
        'data-ui-escaped': hasEngineEscaped
      };

      state.attributes.floating = updatedAttrs;
      state.attributes.target = updatedAttrs;
    }
  };

  // Modifier: Style Map Generator
  function mapToStyles({
    floating,
    floatingRect,
    placement,
    variation,
    offsets,
    position,
    gpuAcceleration,
    adaptive,
    roundOffsets,
    isFixed
  }) {
    let { x = 0, y = 0 } = offsets;
    const rounded = typeof roundOffsets === 'function' ? roundOffsets({ x, y }) : { x, y };
    x = rounded.x;
    y = rounded.y;

    const hasX = offsets.hasOwnProperty('x');
    const hasY = offsets.hasOwnProperty('y');
    let sideX = LEFT;
    let sideY = TOP;
    const win = window;

    if (adaptive) {
      let offsetParent = getOffsetParent(floating);
      let heightProp = 'clientHeight';
      let widthProp = 'clientWidth';

      if (offsetParent === getWindow(floating)) {
        offsetParent = getDocumentElement(floating);
        if (getComputedStyle(offsetParent).position !== 'static' && position === 'absolute') {
          heightProp = 'scrollHeight';
          widthProp = 'scrollWidth';
        }
      }

      if (placement === TOP || ((placement === LEFT || placement === RIGHT) && variation === END)) {
        sideY = BOTTOM;
        const offsetY = isFixed && offsetParent === win && win.visualViewport
          ? win.visualViewport.height
          : offsetParent[heightProp];
        y -= offsetY - floatingRect.height;
        y *= gpuAcceleration ? 1 : -1;
      }

      if (placement === LEFT || ((placement === TOP || placement === BOTTOM) && variation === END)) {
        sideX = RIGHT;
        const offsetX = isFixed && offsetParent === win && win.visualViewport
          ? win.visualViewport.width
          : offsetParent[widthProp];
        x -= offsetX - floatingRect.width;
        x *= gpuAcceleration ? 1 : -1;
      }
    }

    const commonStyles = {
      position,
      ...(adaptive ? UNSET_SIDES : {})
    };

    const roundedDPR = roundOffsets === true ? roundOffsetsByDPR({ x, y }, getWindow(floating)) : { x, y };
    x = roundedDPR.x;
    y = roundedDPR.y;

    if (gpuAcceleration) {
      return {
        ...commonStyles,
        [sideY]: hasY ? '0' : '',
        [sideX]: hasX ? '0' : '',
        transform: (win.devicePixelRatio || 1) <= 1
          ? `translate(${x}px, ${y}px)`
          : `translate3d(${x}px, ${y}px, 0)`
      };
    }

    return {
      ...commonStyles,
      [sideY]: hasY ? `${y}px` : '',
      [sideX]: hasX ? `${x}px` : '',
      transform: ''
    };
  }

  const computeStylesModifier = {
    name: 'computeStyles',
    enabled: true,
    phase: 'beforeWrite',
    fn({ state, options }) {
      const {
        gpuAcceleration = true,
        adaptive = true,
        roundOffsets = true
      } = options;

      const targetEl = state.elements.floating || state.elements.target;
      const targetRect = state.rects.floating || state.rects.target;

      const commonStyles = {
        placement: getBasePlacement(state.placement),
        variation: getVariation(state.placement),
        floating: targetEl,
        floatingRect: targetRect,
        gpuAcceleration,
        isFixed: state.options.strategy === 'fixed'
      };

      const currentOffsets = state.modifiersData.engineOffsets || state.modifiersData.offsets;

      if (currentOffsets != null) {
        const computedFloatingStyles = mapToStyles({
          ...commonStyles,
          offsets: currentOffsets,
          position: state.options.strategy,
          adaptive,
          roundOffsets
        });

        state.styles.floating = { ...state.styles.floating, ...computedFloatingStyles };
        state.styles.target = { ...state.styles.target, ...computedFloatingStyles };
      }

      if (state.modifiersData.arrow != null) {
        state.styles.arrow = {
          ...state.styles.arrow,
          ...mapToStyles({
            ...commonStyles,
            offsets: state.modifiersData.arrow,
            position: 'absolute',
            adaptive: false,
            roundOffsets
          })
        };
      }

      const placementAttr = { 'data-ui-placement': state.placement };
      state.attributes.floating = { ...state.attributes.floating, ...placementAttr };
      state.attributes.target = { ...state.attributes.target, ...placementAttr };
    },
    data: {}
  };

  // Modifier: Apply Styles to DOM Nodes
  const applyStylesModifier = {
    name: 'applyStyles',
    enabled: true,
    phase: 'write',
    requires: ['computeStyles'],
    fn({ state }) {
      Object.keys(state.elements).forEach((name) => {
        const style = state.styles[name] || {};
        const attributes = state.attributes[name] || {};
        const element = state.elements[name];

        if (!isHTMLElement(element) || !getNodeName(element)) {
          return;
        }

        Object.assign(element.style, style);

        Object.keys(attributes).forEach((attrName) => {
          const value = attributes[attrName];
          if (value === false) {
            element.removeAttribute(attrName);
          } else {
            element.setAttribute(attrName, value === true ? '' : value);
          }
        });
      });
    },
    effect({ state }) {
      const initialStyles = {
        floating: {
          position: state.options.strategy,
          left: '0',
          top: '0',
          margin: '0'
        },
        target: {
          position: state.options.strategy,
          left: '0',
          top: '0',
          margin: '0'
        },
        arrow: {
          position: 'absolute'
        },
        reference: {}
      };

      const floatingEl = state.elements.floating || state.elements.target;
      if (floatingEl && isHTMLElement(floatingEl)) {
        Object.assign(floatingEl.style, initialStyles.floating);
      }

      state.styles = initialStyles;

      if (state.elements.arrow && isHTMLElement(state.elements.arrow)) {
        Object.assign(state.elements.arrow.style, initialStyles.arrow);
      }

      return () => {
        Object.keys(state.elements).forEach((name) => {
          const element = state.elements[name];
          const attributes = state.attributes[name] || {};
          const styleProperties = Object.keys(
            state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name] || {}
          );

          const style = styleProperties.reduce((acc, property) => {
            acc[property] = '';
            return acc;
          }, {});

          if (!isHTMLElement(element) || !getNodeName(element)) {
            return;
          }

          Object.assign(element.style, style);

          Object.keys(attributes).forEach((attribute) => {
            element.removeAttribute(attribute);
          });
        });
      };
    }
  };

  /* ==========================================================================
     6. PIPELINE GRAPH RESOLUTION & ORDERING
     ========================================================================== */

  function order(modifiers) {
    const map = new Map();
    const visited = new Set();
    const result = [];

    modifiers.forEach((modifier) => {
      map.set(modifier.name, modifier);
    });

    function sort(modifier) {
      visited.add(modifier.name);
      const requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
      requires.forEach((dep) => {
        if (!visited.has(dep)) {
          const depModifier = map.get(dep);
          if (depModifier) {
            sort(depModifier);
          }
        }
      });
      result.push(modifier);
    }

    modifiers.forEach((modifier) => {
      if (!visited.has(modifier.name)) {
        sort(modifier);
      }
    });

    return result;
  }

  function orderModifiers(modifiers) {
    const orderedModifiers = order(modifiers);
    return PIPELINE_PHASES.reduce((acc, phase) => {
      return acc.concat(orderedModifiers.filter((modifier) => modifier.phase === phase));
    }, []);
  }

  function debounce(fn) {
    let pending;
    return function () {
      if (!pending) {
        pending = new Promise((resolve) => {
          Promise.resolve().then(() => {
            pending = undefined;
            resolve(fn());
          });
        });
      }
      return pending;
    };
  }

  function mergeByName(modifiers) {
    const merged = modifiers.reduce((acc, current) => {
      const existing = acc[current.name];
      acc[current.name] = existing
        ? {
            ...existing,
            ...current,
            options: { ...existing.options, ...current.options },
            data: { ...existing.data, ...current.data }
          }
        : current;
      return acc;
    }, {});

    return Object.keys(merged).map((key) => merged[key]);
  }

  /* ==========================================================================
     7. POSITIONER ENGINE FACTORY & INSTANCE COORDINATOR
     ========================================================================== */

  const DEFAULT_OPTIONS = {
    placement: 'bottom',
    modifiers: [],
    strategy: 'absolute'
  };

  function createPositionerFactory(generatorOptions = {}) {
    const {
      defaultModifiers = [],
      defaultOptions = DEFAULT_OPTIONS
    } = generatorOptions;

    return function createPositionerInstance(reference, element, options = defaultOptions) {
      let state = {
        placement: 'bottom',
        orderedModifiers: [],
        options: { ...DEFAULT_OPTIONS, ...defaultOptions },
        modifiersData: {},
        elements: {
          reference,
          floating: element,
          target: element
        },
        attributes: {},
        styles: {}
      };

      let effectCleanupFns = [];
      let isDestroyed = false;

      const instance = {
        state,
        setOptions(setOptionsAction) {
          const resolvedOptions =
            typeof setOptionsAction === 'function' ? setOptionsAction(state.options) : setOptionsAction;

          cleanupModifierEffects();
          state.options = { ...defaultOptions, ...state.options, ...resolvedOptions };
          state.scrollParents = {
            reference: isElement(reference)
              ? listScrollParents(reference)
              : reference.contextElement
              ? listScrollParents(reference.contextElement)
              : [],
            floating: listScrollParents(element),
            target: listScrollParents(element)
          };

          const orderedModifiers = orderModifiers(
            mergeByName([].concat(defaultModifiers, state.options.modifiers))
          );

          state.orderedModifiers = orderedModifiers.filter((m) => m.enabled !== false);
          runModifierEffects();
          return instance.update();
        },
        forceUpdate() {
          if (isDestroyed) {
            return;
          }

          const { reference: refEl, floating: flEl, target: tgtEl } = state.elements;
          const currentFloatingEl = flEl || tgtEl;

          if (!areValidElements(refEl, currentFloatingEl)) {
            return;
          }

          const floatingLayoutRect = getLayoutRect(currentFloatingEl);

          state.rects = {
            reference: getCompositeRect(refEl, getOffsetParent(currentFloatingEl), state.options.strategy === 'fixed'),
            floating: floatingLayoutRect,
            target: floatingLayoutRect
          };

          state.reset = false;
          state.placement = state.options.placement;

          state.orderedModifiers.forEach((modifier) => {
            state.modifiersData[modifier.name] = { ...modifier.data };
          });

          for (let index = 0; index < state.orderedModifiers.length; index++) {
            if (state.reset === true) {
              state.reset = false;
              index = -1;
              continue;
            }

            const { fn, options: modifierOptions = {}, name } = state.orderedModifiers[index];

            if (typeof fn === 'function') {
              state = fn({
                state,
                options: modifierOptions,
                name,
                instance
              }) || state;
            }
          }
        },
        update: debounce(() => {
          return new Promise((resolve) => {
            instance.forceUpdate();
            resolve(state);
          });
        }),
        destroy() {
          cleanupModifierEffects();
          isDestroyed = true;
        }
      };

      if (!areValidElements(reference, element)) {
        return instance;
      }

      instance.setOptions(options).then((finalState) => {
        if (!isDestroyed && options.onFirstUpdate) {
          options.onFirstUpdate(finalState);
        }
      });

      function runModifierEffects() {
        state.orderedModifiers.forEach(({ name, options: modifierOptions = {}, effect }) => {
          if (typeof effect === 'function') {
            const cleanupFn = effect({
              state,
              name,
              instance,
              options: modifierOptions
            });
            effectCleanupFns.push(cleanupFn || (() => {}));
          }
        });
      }

      function cleanupModifierEffects() {
        effectCleanupFns.forEach((fn) => fn());
        effectCleanupFns = [];
      }

      return instance;
    };
  }

  /* ==========================================================================
     8. ENGINE PRESETS & EXPORTS
     ========================================================================== */

  const defaultModifiersLite = [
    eventListenersModifier,
    engineOffsetsModifier,
    computeStylesModifier,
    applyStylesModifier
  ];

  const defaultModifiersFull = [
    eventListenersModifier,
    engineOffsetsModifier,
    computeStylesModifier,
    applyStylesModifier,
    offsetModifier,
    flipModifier,
    preventOverflowModifier,
    arrowModifier,
    hideModifier
  ];

  const createEngineLite = createPositionerFactory({
    defaultModifiers: defaultModifiersLite
  });

  const createEngine = createPositionerFactory({
    defaultModifiers: defaultModifiersFull
  });

  // Export Core API
  exports.createEngine = createEngine;
  exports.createPositioner = createEngine;
  exports.createEngineLite = createEngineLite;
  exports.createLite = createEngineLite;
  exports.createPositionerFactory = createPositionerFactory;
  exports.engineGenerator = createPositionerFactory;

  // Export Pipeline Utilities
  exports.detectOverflow = detectOverflow;
  exports.computePositionOffsets = computePositionOffsets;
  exports.defaultModifiers = defaultModifiersFull;
  exports.defaultModifiersLite = defaultModifiersLite;

  // Export Individual Modifiers
  exports.applyStyles = applyStylesModifier;
  exports.arrow = arrowModifier;
  exports.computeStyles = computeStylesModifier;
  exports.engineOffsets = engineOffsetsModifier;
  exports.eventListeners = eventListenersModifier;
  exports.flip = flipModifier;
  exports.hide = hideModifier;
  exports.offset = offsetModifier;
  exports.preventOverflow = preventOverflowModifier;

  // Modifier Map Namespace
  exports.modifiers = {
    applyStyles: applyStylesModifier,
    arrow: arrowModifier,
    computeStyles: computeStylesModifier,
    engineOffsets: engineOffsetsModifier,
    eventListeners: eventListenersModifier,
    flip: flipModifier,
    hide: hideModifier,
    offset: offsetModifier,
    preventOverflow: preventOverflowModifier
  };

  Object.defineProperty(exports, '__esModule', { value: true });

})));
