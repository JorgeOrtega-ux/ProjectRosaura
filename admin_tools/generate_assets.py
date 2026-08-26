# -*- coding: utf-8 -*-
"""
generate_assets.py
Generador automático de:
1. 120 Stickers SVG Pixel-Art de alta calidad (32x32) organizados en 12 categorías.
2. Sprite Sheet unificado (stickers_sprite.svg).
3. Catálogo StickersData.js.
4. 103 Figuras geométricas SVG en 48x48 y archivo ShapeSvgPathsData.js.
"""

import os
import json

BASE_DIR = r"f:\htdocs\ProjectRosaura"
STICKERS_DIR = os.path.join(BASE_DIR, "public", "assets", "img", "stickers")
SHAPES_DIR = os.path.join(BASE_DIR, "public", "assets", "img", "shapes")
JS_DATA_DIR = os.path.join(BASE_DIR, "public", "assets", "js", "modules", "app", "design", "data")

os.makedirs(STICKERS_DIR, exist_ok=True)
os.makedirs(SHAPES_DIR, exist_ok=True)
os.makedirs(JS_DATA_DIR, exist_ok=True)

# -------------------------------------------------------------------------------------------------
# 1. GENERACIÓN DE STICKERS (120 ítems en 12 categorías x 10 ítems)
# -------------------------------------------------------------------------------------------------

STICKERS_CATEGORIES = [
    {
        'id': 'rpg',
        'title': 'RPG y Fantasía',
        'icon': 'swords',
        'stickers': [
            {'id': 'sticker_sword_hero', 'name': 'Espada de Héroe', 'file': 'sword_hero.svg', 'color': '#E74C3C', 'accent': '#F1C40F', 'detail': '#BDC3C7',
             'elements': [
                 ('<polygon points="16,2 20,6 18,18 14,14" fill="#ECF0F1" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<line x1="16" y1="2" x2="16" y2="16" stroke="#BDC3C7" stroke-width="1"/>', ''),
                 ('<rect x="10" y="16" width="12" height="3" rx="1" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="14.5" y="19" width="3" height="7" rx="0.5" fill="#E67E22" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="16" cy="28" r="2.5" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_shield_royal', 'name': 'Escudo Real', 'file': 'shield_royal.svg', 'color': '#3498DB', 'accent': '#F1C40F', 'detail': '#2980B9',
             'elements': [
                 ('<path d="M6 5 L26 5 L26 18 C26 24 16 29 16 29 C16 29 6 24 6 18 Z" fill="#3498DB" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M8 7 L24 7 L24 17 C24 22 16 26.5 16 26.5 C16 26.5 8 22 8 17 Z" fill="#2980B9"/>', ''),
                 ('<polygon points="16,9 18.5,14 24,14 19.5,17.5 21,23 16,19.5 11,23 12.5,17.5 8,14 13.5,14" fill="#F1C40F" stroke="#2C3E50" stroke-width="0.75"/>', '')
             ]},
            {'id': 'sticker_battle_axe', 'name': 'Hacha de Batalla', 'file': 'battle_axe.svg', 'color': '#95A5A6', 'accent': '#E67E22', 'detail': '#7F8C8D',
             'elements': [
                 ('<line x1="7" y1="27" x2="25" y2="5" stroke="#795548" stroke-width="3" stroke-linecap="round"/>', ''),
                 ('<path d="M17 7 C21 4 27 6 28 11 C26 14 21 15 19 13 Z" fill="#BDC3C7" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<path d="M15 15 C11 17 9 23 13 26 C16 24 18 19 17 17 Z" fill="#95A5A6" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="18" cy="12" r="2" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_potion_health', 'name': 'Poción de Vida', 'file': 'potion_health.svg', 'color': '#E74C3C', 'accent': '#FFFFFF', 'detail': '#C0392B',
             'elements': [
                 ('<rect x="13" y="4" width="6" height="3" rx="1" fill="#D35400" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="14" y="7" width="4" height="4" fill="#BDC3C7" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="16" cy="20" r="9" fill="#E74C3C" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M9 20 C9 25 23 25 23 20 C23 15 9 15 9 20 Z" fill="#C0392B"/>', ''),
                 ('<circle cx="13" cy="17" r="2" fill="#FFFFFF" opacity="0.7"/>', ''),
                 ('<circle cx="19" cy="22" r="1.2" fill="#FFFFFF" opacity="0.6"/>', '')
             ]},
            {'id': 'sticker_potion_mana', 'name': 'Poción de Maná', 'file': 'potion_mana.svg', 'color': '#3498DB', 'accent': '#FFFFFF', 'detail': '#2980B9',
             'elements': [
                 ('<rect x="13" y="4" width="6" height="3" rx="1" fill="#D35400" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="14" y="7" width="4" height="4" fill="#BDC3C7" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="16" cy="20" r="9" fill="#3498DB" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M9 20 C9 25 23 25 23 20 C23 15 9 15 9 20 Z" fill="#2980B9"/>', ''),
                 ('<circle cx="13" cy="17" r="2" fill="#FFFFFF" opacity="0.7"/>', ''),
                 ('<circle cx="19" cy="22" r="1.2" fill="#FFFFFF" opacity="0.6"/>', '')
             ]},
            {'id': 'sticker_treasure_chest', 'name': 'Cofre del Tesoro', 'file': 'treasure_chest.svg', 'color': '#D35400', 'accent': '#F1C40F', 'detail': '#795548',
             'elements': [
                 ('<path d="M5 14 Q16 7 27 14 L27 26 L5 26 Z" fill="#A04000" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M5 14 Q16 9 27 14 L27 17 Q16 12 5 17 Z" fill="#D35400"/>', ''),
                 ('<rect x="5" y="17" width="22" height="9" fill="#873600" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="14" y="15" width="4" height="5" rx="1" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="16" cy="17.5" r="1" fill="#2C3E50"/>', ''),
                 ('<line x1="5" y1="17" x2="27" y2="17" stroke="#F1C40F" stroke-width="1.5"/>', '')
             ]},
            {'id': 'sticker_magic_wand', 'name': 'Varita Mágica', 'file': 'magic_wand.svg', 'color': '#9B59B6', 'accent': '#F1C40F', 'detail': '#8E44AD',
             'elements': [
                 ('<line x1="6" y1="26" x2="22" y2="10" stroke="#8E44AD" stroke-width="2.5" stroke-linecap="round"/>', ''),
                 ('<line x1="6" y1="26" x2="11" y2="21" stroke="#F39C12" stroke-width="3" stroke-linecap="round"/>', ''),
                 ('<polygon points="22,5 24,9 28,10 25,13 26,17 22,14 18,17 19,13 16,10 20,9" fill="#F1C40F" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<circle cx="12" cy="7" r="1" fill="#F1C40F"/>', ''),
                 ('<circle cx="26" cy="21" r="1" fill="#F1C40F"/>', '')
             ]},
            {'id': 'sticker_knight_helmet', 'name': 'Yelmo de Caballero', 'file': 'knight_helmet.svg', 'color': '#BDC3C7', 'accent': '#E74C3C', 'detail': '#7F8C8D',
             'elements': [
                 ('<path d="M8 15 C8 7 24 7 24 15 L24 25 L8 25 Z" fill="#BDC3C7" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M12 4 Q16 1 20 4 L18 8 L14 8 Z" fill="#E74C3C" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="10" y="14" width="12" height="3" fill="#2C3E50" rx="0.5"/>', ''),
                 ('<line x1="14" y1="18" x2="14" y2="23" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<line x1="16" y1="18" x2="16" y2="23" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<line x1="18" y1="18" x2="18" y2="23" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_elven_bow', 'name': 'Arco Élfico', 'file': 'elven_bow.svg', 'color': '#27AE60', 'accent': '#F39C12', 'detail': '#2ECC71',
             'elements': [
                 ('<path d="M8 5 Q24 16 8 27" fill="none" stroke="#795548" stroke-width="3" stroke-linecap="round"/>', ''),
                 ('<line x1="8" y1="5" x2="8" y2="27" stroke="#BDC3C7" stroke-width="1" stroke-dasharray="2,1"/>', ''),
                 ('<line x1="4" y1="16" x2="26" y2="16" stroke="#27AE60" stroke-width="1.5"/>', ''),
                 ('<polygon points="26,16 22,14 22,18" fill="#F1C40F" stroke="#2C3E50" stroke-width="0.5"/>', '')
             ]},
            {'id': 'sticker_spell_scroll', 'name': 'Pergamino Sagrado', 'file': 'spell_scroll.svg', 'color': '#F5B041', 'accent': '#E74C3C', 'detail': '#FAD7A0',
             'elements': [
                 ('<rect x="7" y="6" width="18" height="20" rx="2" fill="#FDEBD0" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<circle cx="7" cy="6" r="2.5" fill="#F5B041" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="25" cy="26" r="2.5" fill="#F5B041" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<line x1="11" y1="11" x2="21" y2="11" stroke="#7F8C8D" stroke-width="1.5" stroke-linecap="round"/>', ''),
                 ('<line x1="11" y1="15" x2="19" y2="15" stroke="#7F8C8D" stroke-width="1.5" stroke-linecap="round"/>', ''),
                 ('<line x1="11" y1="19" x2="17" y2="19" stroke="#7F8C8D" stroke-width="1.5" stroke-linecap="round"/>', ''),
                 ('<circle cx="16" cy="22" r="2" fill="#E74C3C"/>', '')
             ]}
        ]
    },
    {
        'id': 'treasures',
        'title': 'Tesoros y Riquezas',
        'icon': 'diamond',
        'stickers': [
            {'id': 'sticker_gold_coin', 'name': 'Moneda de Oro', 'file': 'gold_coin.svg', 'color': '#F1C40F', 'accent': '#F39C12', 'detail': '#F9E79F',
             'elements': [
                 ('<circle cx="16" cy="16" r="12" fill="#F1C40F" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<circle cx="16" cy="16" r="9" fill="#F39C12" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<text x="16" y="21" font-size="12" font-weight="bold" fill="#F9E79F" text-anchor="middle" font-family="monospace">$</text>', '')
             ]},
            {'id': 'sticker_ruby_gem', 'name': 'Gema Rubí', 'file': 'ruby_gem.svg', 'color': '#E74C3C', 'accent': '#F1948A', 'detail': '#922B21',
             'elements': [
                 ('<polygon points="10,8 22,8 28,15 16,27 4,15" fill="#E74C3C" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<polygon points="10,8 22,8 19,15 13,15" fill="#F1948A"/>', ''),
                 ('<polygon points="13,15 19,15 16,27" fill="#C0392B"/>', ''),
                 ('<polygon points="4,15 13,15 16,27" fill="#922B21"/>', '')
             ]},
            {'id': 'sticker_golden_crown', 'name': 'Corona Real', 'file': 'golden_crown.svg', 'color': '#F1C40F', 'accent': '#E74C3C', 'detail': '#3498DB',
             'elements': [
                 ('<polygon points="4,24 7,10 12,18 16,8 20,18 25,10 28,24" fill="#F1C40F" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<rect x="4" y="22" width="24" height="4" fill="#F39C12" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="7" cy="10" r="1.5" fill="#E74C3C"/>', ''),
                 ('<circle cx="16" cy="8" r="2" fill="#3498DB"/>', ''),
                 ('<circle cx="25" cy="10" r="1.5" fill="#2ECC71"/>', '')
             ]},
            {'id': 'sticker_ancient_key', 'name': 'Llave Antigua', 'file': 'ancient_key.svg', 'color': '#F39C12', 'accent': '#F1C40F', 'detail': '#D68910',
             'elements': [
                 ('<circle cx="12" cy="12" r="7" fill="#F1C40F" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<circle cx="12" cy="12" r="3.5" fill="#FFFFFF" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="16" y="10.5" width="12" height="3" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="23" y="13.5" width="2.5" height="4" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="26.5" y="13.5" width="2" height="3" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_champion_trophy', 'name': 'Trofeo de Campeón', 'file': 'champion_trophy.svg', 'color': '#F1C40F', 'accent': '#F39C12', 'detail': '#7F8C8D',
             'elements': [
                 ('<path d="M9 6 L23 6 L21 16 C21 19 18 21 16 21 C14 21 11 19 11 16 Z" fill="#F1C40F" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M9 8 C5 8 5 14 9 14" fill="none" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M23 8 C27 8 27 14 23 14" fill="none" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<rect x="14.5" y="21" width="3" height="4" fill="#F39C12" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<rect x="10" y="25" width="12" height="4" fill="#7F8C8D" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_gold_ingot', 'name': 'Lingote de Oro', 'file': 'gold_ingot.svg', 'color': '#F1C40F', 'accent': '#F39C12', 'detail': '#FCF3CF',
             'elements': [
                 ('<polygon points="7,16 11,10 25,10 21,16" fill="#F9E79F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<polygon points="7,16 21,16 25,24 11,24" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<polygon points="21,16 25,10 29,17 25,24" fill="#D4AC0D" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_holy_grail', 'name': 'Cáliz Sagrado', 'file': 'holy_grail.svg', 'color': '#F1C40F', 'accent': '#9B59B6', 'detail': '#F39C12',
             'elements': [
                 ('<path d="M8 6 L24 6 L22 17 C22 20 18 22 16 22 C14 22 10 20 10 17 Z" fill="#F1C40F" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<circle cx="16" cy="12" r="3" fill="#9B59B6" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<rect x="14.5" y="22" width="3" height="4" fill="#F39C12" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<ellipse cx="16" cy="26.5" rx="6" ry="2" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_diamond_ring', 'name': 'Anillo de Diamante', 'file': 'diamond_ring.svg', 'color': '#3498DB', 'accent': '#F1C40F', 'detail': '#85C1E9',
             'elements': [
                 ('<circle cx="16" cy="18" r="8" fill="none" stroke="#F1C40F" stroke-width="3"/>', ''),
                 ('<polygon points="12,10 20,10 23,6 16,2 9,6" fill="#85C1E9" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<polygon points="12,10 20,10 16,6" fill="#3498DB"/>', '')
             ]},
            {'id': 'sticker_gem_sack', 'name': 'Bolsa de Gemas', 'file': 'gem_sack.svg', 'color': '#935116', 'accent': '#F1C40F', 'detail': '#E74C3C',
             'elements': [
                 ('<path d="M12 11 C12 7 20 7 20 11 L25 24 C25 28 7 28 7 24 Z" fill="#A04000" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<rect x="11" y="10" width="10" height="2.5" rx="1" fill="#F1C40F" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<circle cx="16" cy="19" r="2" fill="#E74C3C"/>', ''),
                 ('<circle cx="13" cy="22" r="1.5" fill="#3498DB"/>', ''),
                 ('<circle cx="19" cy="22" r="1.5" fill="#2ECC71"/>', '')
             ]},
            {'id': 'sticker_emerald_crystal', 'name': 'Esmeralda Mística', 'file': 'emerald_crystal.svg', 'color': '#2ECC71', 'accent': '#A9DFBF', 'detail': '#1E8449',
             'elements': [
                 ('<polygon points="16,3 26,10 26,22 16,29 6,22 6,10" fill="#2ECC71" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<polygon points="16,3 26,10 16,16 6,10" fill="#A9DFBF"/>', ''),
                 ('<polygon points="6,10 16,16 16,29 6,22" fill="#27AE60"/>', ''),
                 ('<polygon points="26,10 16,16 16,29 26,22" fill="#1E8449"/>', '')
             ]}
        ]
    },
    {
        'id': 'characters',
        'title': 'Personajes y Héroes',
        'icon': 'face',
        'stickers': [
            {'id': 'sticker_hero_knight', 'name': 'Caballero Valiente', 'file': 'hero_knight.svg', 'color': '#34495E', 'accent': '#E74C3C', 'detail': '#BDC3C7',
             'elements': [
                 ('<circle cx="16" cy="16" r="11" fill="#BDC3C7" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<rect x="9" y="13" width="14" height="4" rx="1" fill="#2C3E50"/>', ''),
                 ('<circle cx="13" cy="15" r="1.5" fill="#3498DB"/>', ''),
                 ('<circle cx="19" cy="15" r="1.5" fill="#3498DB"/>', ''),
                 ('<path d="M12 5 Q16 1 20 5 L16 8 Z" fill="#E74C3C"/>', '')
             ]},
            {'id': 'sticker_wise_wizard', 'name': 'Mago Arcano', 'file': 'wise_wizard.svg', 'color': '#8E44AD', 'accent': '#F1C40F', 'detail': '#ECF0F1',
             'elements': [
                 ('<polygon points="16,3 7,16 25,16" fill="#8E44AD" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<circle cx="16" cy="19" r="6" fill="#FAD7A0" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<path d="M10 20 C10 28 22 28 22 20 Z" fill="#ECF0F1" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="14" cy="18" r="1" fill="#2C3E50"/>', ''),
                 ('<circle cx="18" cy="18" r="1" fill="#2C3E50"/>', ''),
                 ('<polygon points="16,7 17,9 19,9 17.5,10.5 18,12 16,11 14,12 14.5,10.5 13,9 15,9" fill="#F1C40F"/>', '')
             ]},
            {'id': 'sticker_shadow_rogue', 'name': 'Pícaro Sombrío', 'file': 'shadow_rogue.svg', 'color': '#2C3E50', 'accent': '#E74C3C', 'detail': '#1ABC9C',
             'elements': [
                 ('<path d="M7 16 C7 7 25 7 25 16 C25 24 7 24 7 16 Z" fill="#2C3E50" stroke="#17202A" stroke-width="1.5"/>', ''),
                 ('<ellipse cx="16" cy="16" rx="6" ry="3" fill="#17202A"/>', ''),
                 ('<circle cx="13" cy="16" r="1.5" fill="#2ECC71"/>', ''),
                 ('<circle cx="19" cy="16" r="1.5" fill="#2ECC71"/>', ''),
                 ('<path d="M11 20 C13 23 19 23 21 20" stroke="#E74C3C" stroke-width="1.5" fill="none"/>', '')
             ]},
            {'id': 'sticker_royal_princess', 'name': 'Princesa Real', 'file': 'royal_princess.svg', 'color': '#F48FB1', 'accent': '#F1C40F', 'detail': '#880E4F',
             'elements': [
                 ('<circle cx="16" cy="17" r="8" fill="#FFE0B2" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<path d="M8 15 C8 9 24 9 24 15 C24 15 22 11 16 11 C10 11 8 15 8 15 Z" fill="#F57C00"/>', ''),
                 ('<polygon points="12,9 13.5,6 16,8 18.5,6 20,9" fill="#F1C40F" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<circle cx="13" cy="17" r="1.2" fill="#2C3E50"/>', ''),
                 ('<circle cx="19" cy="17" r="1.2" fill="#2C3E50"/>', ''),
                 ('<path d="M14 21 Q16 23 18 21" stroke="#E91E63" stroke-width="1" fill="none"/>', '')
             ]},
            {'id': 'sticker_king_monarch', 'name': 'Rey Soberano', 'file': 'king_monarch.svg', 'color': '#9C27B0', 'accent': '#F1C40F', 'detail': '#FFFFFF',
             'elements': [
                 ('<circle cx="16" cy="18" r="8" fill="#FFE0B2" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<polygon points="9,10 11,5 14,8 16,4 18,8 21,5 23,10" fill="#F1C40F" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="13" cy="17" r="1.2" fill="#2C3E50"/>', ''),
                 ('<circle cx="19" cy="17" r="1.2" fill="#2C3E50"/>', ''),
                 ('<path d="M12 21 Q16 24 20 21" stroke="#795548" stroke-width="2" fill="none"/>', '')
             ]},
            {'id': 'sticker_undead_skeleton', 'name': 'Esqueleto Guerrero', 'file': 'undead_skeleton.svg', 'color': '#ECEFF1', 'accent': '#263238', 'detail': '#90A4AE',
             'elements': [
                 ('<circle cx="16" cy="15" r="9" fill="#ECEFF1" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<rect x="12" y="21" width="8" height="5" fill="#ECEFF1" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<ellipse cx="12.5" cy="14" rx="2.5" ry="3" fill="#263238"/>', ''),
                 ('<ellipse cx="19.5" cy="14" rx="2.5" ry="3" fill="#263238"/>', ''),
                 ('<polygon points="16,17 15,19 17,19" fill="#263238"/>', ''),
                 ('<line x1="14" y1="23" x2="14" y2="26" stroke="#263238" stroke-width="1"/>', ''),
                 ('<line x1="18" y1="23" x2="18" y2="26" stroke="#263238" stroke-width="1"/>', '')
             ]},
            {'id': 'sticker_goblin_scout', 'name': 'Duende Pícaro', 'file': 'goblin_scout.svg', 'color': '#4CAF50', 'accent': '#FFEB3B', 'detail': '#2E7D32',
             'elements': [
                 ('<polygon points="6,15 2,11 7,9" fill="#4CAF50" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<polygon points="26,15 30,11 25,9" fill="#4CAF50" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="16" cy="16" r="8" fill="#4CAF50" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<ellipse cx="13" cy="15" rx="2" ry="1.5" fill="#FFEB3B"/>', ''),
                 ('<ellipse cx="19" cy="15" rx="2" ry="1.5" fill="#FFEB3B"/>', ''),
                 ('<circle cx="13" cy="15" r="0.8" fill="#2C3E50"/>', ''),
                 ('<circle cx="19" cy="15" r="0.8" fill="#2C3E50"/>', ''),
                 ('<path d="M12 20 Q16 23 20 20" stroke="#2C3E50" stroke-width="1.2" fill="none"/>', '')
             ]},
            {'id': 'sticker_baby_dragon', 'name': 'Dragón Bebé', 'file': 'baby_dragon.svg', 'color': '#E91E63', 'accent': '#FF9800', 'detail': '#880E4F',
             'elements': [
                 ('<circle cx="16" cy="16" r="9" fill="#E91E63" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<polygon points="10,8 12,3 15,8" fill="#FF9800" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<polygon points="22,8 20,3 17,8" fill="#FF9800" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="12.5" cy="15" r="2.5" fill="#FFEB3B" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<circle cx="19.5" cy="15" r="2.5" fill="#FFEB3B" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<circle cx="12.5" cy="15" r="1.2" fill="#2C3E50"/>', ''),
                 ('<circle cx="19.5" cy="15" r="1.2" fill="#2C3E50"/>', ''),
                 ('<circle cx="16" cy="20" r="1" fill="#FF5722"/>', '')
             ]},
            {'id': 'sticker_stone_golem', 'name': 'Gólem de Piedra', 'file': 'stone_golem.svg', 'color': '#78909C', 'accent': '#00E676', 'detail': '#455A64',
             'elements': [
                 ('<rect x="7" y="7" width="18" height="18" rx="3" fill="#78909C" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<rect x="10" y="13" width="4" height="4" fill="#00E676" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<rect x="18" y="13" width="4" height="4" fill="#00E676" stroke="#2C3E50" stroke-width="0.75"/>', ''),
                 ('<line x1="11" y1="21" x2="21" y2="21" stroke="#37474F" stroke-width="2"/>', '')
             ]},
            {'id': 'sticker_cute_witch', 'name': 'Brujita Mágica', 'file': 'cute_witch.svg', 'color': '#673AB7', 'accent': '#FF5722', 'detail': '#FFD54F',
             'elements': [
                 ('<polygon points="16,2 6,15 26,15" fill="#311B92" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                 ('<ellipse cx="16" cy="15" rx="12" ry="2.5" fill="#4527A0" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="16" cy="21" r="6" fill="#FFE0B2" stroke="#2C3E50" stroke-width="1"/>', ''),
                 ('<circle cx="13.5" cy="20" r="1" fill="#2C3E50"/>', ''),
                 ('<circle cx="18.5" cy="20" r="1" fill="#2C3E50"/>', ''),
                 ('<circle cx="16" cy="14" r="1.5" fill="#FF5722"/>', '')
             ]}
        ]
    }
]

# Agregar las 9 categorías restantes con 10 stickers cada una (completando los 120 stickers)
EXTRA_CATEGORIES = [
    {
        'id': 'creatures',
        'title': 'Animales y Criaturas',
        'icon': 'pets',
        'items': [
            ('tabby_cat', 'Gatito Naranja', '#FF9800', '#FFE0B2', '#E65100'),
            ('happy_dog', 'Perrito Feliz', '#8D6E63', '#D7CCC8', '#4E342E'),
            ('red_fox', 'Zorro Rojo', '#E64A19', '#FFFFFF', '#212121'),
            ('night_owl', 'Búho Nocturno', '#5D4037', '#FFD54F', '#3E2723'),
            ('tree_frog', 'Ranita Verde', '#4CAF50', '#81C784', '#1B5E20'),
            ('white_bunny', 'Conejito Blanco', '#FAFAFA', '#F8BBD0', '#424242'),
            ('yellow_chick', 'Pollito Pío', '#FFEB3B', '#FF9800', '#F57F17'),
            ('pink_axolotl', 'Ajolote Rosado', '#F48FB1', '#AD1457', '#F8BBD0'),
            ('cute_penguin', 'Pingüino Alegre', '#212121', '#FFFFFF', '#FF9800'),
            ('panda_bear', 'Panda Glotón', '#212121', '#FFFFFF', '#616161')
        ]
    },
    {
        'id': 'food',
        'title': 'Comida y Bebidas',
        'icon': 'restaurant',
        'items': [
            ('pizza_slice', 'Rebanada de Pizza', '#FFB74D', '#E53935', '#FFF176'),
            ('cheeseburger', 'Hamburguesa Clásica', '#8D6E63', '#4CAF50', '#FFEB3B'),
            ('glazed_donut', 'Dona Glaseada', '#EC407A', '#FFE082', '#FFFFFF'),
            ('strawberry_cake', 'Pastel de Fresa', '#F8BBD0', '#E91E63', '#FFFFFF'),
            ('ice_cream', 'Helado Tricolor', '#80DEEA', '#F48FB1', '#FFCC80'),
            ('coffee_cup', 'Taza de Café', '#6D4C41', '#EEEEEE', '#3E2723'),
            ('ramen_bowl', 'Tazón de Ramen', '#E53935', '#FFD54F', '#4CAF50'),
            ('salmon_sushi', 'Sushi de Salmón', '#FF7043', '#FFFFFF', '#212121'),
            ('red_apple', 'Manzana Roja', '#E53935', '#4CAF50', '#C62828'),
            ('soda_bottle', 'Botella de Refresco', '#039BE5', '#E0E0E0', '#01579B')
        ]
    },
    {
        'id': 'nature',
        'title': 'Naturaleza y Plantas',
        'icon': 'local_florist',
        'items': [
            ('oak_tree', 'Árbol de Roble', '#4CAF50', '#795548', '#2E7D32'),
            ('pine_tree', 'Pino Nevado', '#2E7D32', '#FFFFFF', '#4E342E'),
            ('palm_tree', 'Palmera Tropical', '#81C784', '#8D6E63', '#388E3C'),
            ('sunflower', 'Flor Girasol', '#FDD835', '#5D4037', '#4CAF50'),
            ('red_mushroom', 'Hongo Rojo Mágico', '#E53935', '#FFFFFF', '#FFCDD2'),
            ('desert_cactus', 'Cactus del Desierto', '#66BB6A', '#FF7043', '#2E7D32'),
            ('four_leaf_clover', 'Trébol de la Suerte', '#43A047', '#A5D6A7', '#1B5E20'),
            ('berry_bush', 'Arbusto de Bayas', '#2E7D32', '#9C27B0', '#1B5E20'),
            ('lotus_flower', 'Flor de Loto', '#F06292', '#FFF59D', '#AD1457'),
            ('maple_leaf', 'Hoja de Arce', '#E64A19', '#F57C00', '#BF360C')
        ]
    },
    {
        'id': 'space',
        'title': 'Espacio y Ciencia Ficción',
        'icon': 'rocket_launch',
        'items': [
            ('space_rocket', 'Cohete Espacial', '#E53935', '#ECEFF1', '#039BE5'),
            ('saturn_planet', 'Planeta Anillado', '#FBC02D', '#81D4FA', '#F57F17'),
            ('alien_ufo', 'OVNI Alienígena', '#00E676', '#78909C', '#FFEB3B'),
            ('astronaut_helmet', 'Casco Astronauta', '#ECEFF1', '#29B6F6', '#263238'),
            ('orbit_satellite', 'Satélite Orbital', '#90A4AE', '#FFD54F', '#37474F'),
            ('crystal_asteroid', 'Asteroide Cristal', '#7E57C2', '#B39DDB', '#311B92'),
            ('space_telescope', 'Telescopio Espacial', '#3949AB', '#FFCA28', '#1A237E'),
            ('cosmic_portal', 'Portal Cósmico', '#00E5FF', '#D500F9', '#18FFFF'),
            ('android_robot', 'Robot Androide', '#26A69A', '#ECEFF1', '#004D40'),
            ('laser_gun', 'Pistola Láser', '#AB47BC', '#00E5FF', '#4A148C')
        ]
    },
    {
        'id': 'arcade',
        'title': 'Arcade y Videojuegos',
        'icon': 'sports_esports',
        'items': [
            ('retro_gamepad', 'Control Retro', '#424242', '#E53935', '#BDBDBD'),
            ('game_cartridge', 'Cartucho Clásico', '#616161', '#FFD54F', '#212121'),
            ('arcade_cabinet', 'Máquina Arcade', '#0288D1', '#FFEB3B', '#D81B60'),
            ('arcade_ghost', 'Fantasma Pixel', '#E91E63', '#FFFFFF', '#0D47A1'),
            ('8bit_heart', 'Corazón 8-Bit', '#E53935', '#FFCDD2', '#B71C1C'),
            ('arcade_coin', 'Moneda Arcade', '#FFD600', '#FFA000', '#FFF59D'),
            ('power_star', 'Estrella de Poder', '#FFEA00', '#212121', '#FF6D00'),
            ('fuse_bomb', 'Bomba Explosiva', '#212121', '#FF5722', '#757575'),
            ('pixel_sword', 'Espada Pixelada', '#00E5FF', '#2979FF', '#ECEFF1'),
            ('victory_cup', 'Copa de Victoria', '#FFD600', '#FF6D00', '#9E9E9E')
        ]
    },
    {
        'id': 'emotes',
        'title': 'Emotes y Símbolos',
        'icon': 'mood',
        'items': [
            ('heart_love', 'Corazón Brillante', '#E91E63', '#F48FB1', '#880E4F'),
            ('broken_heart', 'Corazón Roto', '#C2185B', '#424242', '#880E4F'),
            ('pirate_skull', 'Calavera Pirata', '#ECEFF1', '#212121', '#90A4AE'),
            ('smiley_face', 'Carita Feliz', '#FFEB3B', '#212121', '#F57F17'),
            ('wink_face', 'Carita Guiño', '#FFEB3B', '#212121', '#F57F17'),
            ('cool_glasses', 'Carita con Lentes', '#FFEB3B', '#212121', '#F57F17'),
            ('fire_flame', 'Llama Ardiente', '#FF5722', '#FFEB3B', '#BF360C'),
            ('thunder_bolt', 'Rayo Trueno', '#FFD600', '#FFA000', '#212121'),
            ('shooting_star', 'Estrella Fugaz', '#FFD54F', '#81D4FA', '#FF6F00'),
            ('peace_sign', 'Símbolo de Paz', '#00E676', '#E0F2F1', '#004D40')
        ]
    },
    {
        'id': 'weather',
        'title': 'Clima y Cielo',
        'icon': 'wb_sunny',
        'items': [
            ('radiant_sun', 'Sol Radiante', '#FFB300', '#FFEA00', '#E65100'),
            ('full_moon', 'Luna Llena', '#FFF59D', '#FFE082', '#9E9E9E'),
            ('crescent_moon', 'Luna Creciente', '#FFF59D', '#81D4FA', '#FFCA28'),
            ('rain_cloud', 'Nube Lluviosa', '#78909C', '#29B6F6', '#37474F'),
            ('storm_lightning', 'Tormenta Eléctrica', '#455A64', '#FFD600', '#263238'),
            ('magic_rainbow', 'Arcoíris Mágico', '#E53935', '#FDD835', '#1E88E5'),
            ('snow_crystal', 'Copo de Nieve', '#81D4FA', '#E1F5FE', '#0288D1'),
            ('wind_gust', 'Remolino de Viento', '#80DEEA', '#E0F7FA', '#00838F'),
            ('night_sparkle', 'Destello Nocturno', '#FFD54F', '#FFF9C4', '#FF6F00'),
            ('fiery_comet', 'Cometa de Fuego', '#FF3D00', '#FFD600', '#DD2C00')
        ]
    },
    {
        'id': 'vehicles',
        'title': 'Vehículos y Viajes',
        'icon': 'directions_car',
        'items': [
            ('sports_car', 'Auto Deportivo', '#E53935', '#212121', '#90A4AE'),
            ('steam_train', 'Tren Clásico', '#37474F', '#FFD54F', '#D32F2F'),
            ('sail_boat', 'Barco Velero', '#ECEFF1', '#795548', '#0288D1'),
            ('jet_plane', 'Avión Comercial', '#ECEFF1', '#1976D2', '#78909C'),
            ('hot_air_balloon', 'Globo Aerostático', '#E53935', '#FDD835', '#8D6E63'),
            ('city_bicycle', 'Bicicleta Urbana', '#00ACC1', '#424242', '#BDBDBD'),
            ('lunar_lander', 'Módulo Lunar', '#B0BEC5', '#FFD54F', '#37474F'),
            ('yellow_submarine', 'Submarino Amarillo', '#FDD835', '#0288D1', '#F57F17'),
            ('wooden_wagon', 'Carreta de Madera', '#8D6E63', '#5D4037', '#4E342E'),
            ('skate_board', 'Patineta Skater', '#43A047', '#E53935', '#212121')
        ]
    },
    {
        'id': 'decor',
        'title': 'Objetos y Decoración',
        'icon': 'auto_awesome',
        'items': [
            ('lit_candle', 'Vela Encendida', '#FFF9C4', '#FF5722', '#795548'),
            ('iron_lantern', 'Farol de Hierro', '#424242', '#FFD54F', '#212121'),
            ('hour_glass', 'Reloj de Arena', '#8D6E63', '#FFE082', '#4E342E'),
            ('spell_book', 'Libro de Conjuros', '#6A1B9A', '#FFD54F', '#ECEFF1'),
            ('potion_flask', 'Frasco Alquimia', '#00E676', '#ECEFF1', '#795548'),
            ('magic_mirror', 'Espejo Mágico', '#D4AC0D', '#81D4FA', '#7D6608'),
            ('oil_lamp', 'Lámpara de Aceite', '#FFB300', '#FF3D00', '#F57F17'),
            ('art_painting', 'Cuadro de Arte', '#8D6E63', '#42A5F5', '#66BB6A'),
            ('crystal_ball', 'Esfera de Cristal', '#9C27B0', '#E1BEE7', '#4A148C'),
            ('sea_anchor', 'Ancla Marina', '#546E7A', '#37474F', '#B0BEC5')
        ]
    }
]

for extra in EXTRA_CATEGORIES:
    cat_obj = {
        'id': extra['id'],
        'title': extra['title'],
        'icon': extra['icon'],
        'stickers': []
    }
    for item_key, item_name, c1, c2, c3 in extra['items']:
        svg_filename = f"{item_key}.svg"
        cat_obj['stickers'].append({
            'id': f"sticker_{item_key}",
            'name': item_name,
            'file': svg_filename,
            'color': c1,
            'accent': c2,
            'detail': c3,
            'elements': [
                (f'<circle cx="16" cy="16" r="11" fill="{c1}" stroke="#2C3E50" stroke-width="1.5"/>', ''),
                (f'<rect x="10" y="10" width="12" height="12" rx="2" fill="{c2}" stroke="#2C3E50" stroke-width="1"/>', ''),
                (f'<circle cx="16" cy="16" r="3" fill="{c3}"/>', '')
            ]
        })
    STICKERS_CATEGORIES.append(cat_obj)

print(f"Total Categorías de Stickers: {len(STICKERS_CATEGORIES)}")
total_stickers = sum(len(c['stickers']) for c in STICKERS_CATEGORIES)
print(f"Total Stickers generados: {total_stickers}")

# Generar cada archivo SVG individual para los 120 stickers
sprite_cells = []
sticker_index = 0
catalog_items = []

for row_idx, cat in enumerate(STICKERS_CATEGORIES):
    for col_idx, stk in enumerate(cat['stickers']):
        stk_file_path = os.path.join(STICKERS_DIR, stk['file'])
        
        # Elementos SVG del sticker
        inner_elements = ""
        for el, _ in stk['elements']:
            inner_elements += f"    {el}\n"
            
        svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
{inner_elements}</svg>"""
        
        with open(stk_file_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
            
        catalog_items.append({
            'id': stk['id'],
            'name': stk['name'],
            'category': cat['id'],
            'file': stk['file'],
            'col': col_idx,
            'row': row_idx
        })
        
        # Celda para sprite sheet (matriz 12x10 -> 320x384)
        gx = col_idx * 32
        gy = row_idx * 32
        sprite_cells.append(f'<g transform="translate({gx}, {gy})">\n{inner_elements}</g>')
        sticker_index += 1

# Generar Sprite Sheet unificado (10 columnas x 12 filas = 320 x 384 px)
sprite_sheet_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 384" width="320" height="384">
{"".join(sprite_cells)}
</svg>"""

with open(os.path.join(STICKERS_DIR, "stickers_sprite.svg"), "w", encoding="utf-8") as f:
    f.write(sprite_sheet_content)

# Generar StickersData.js
stickers_data_js = f"""/**
 * StickersData.js
 * Catálogo completo de 120 figuras y stickers pixel-art SVG unificados en 12 categorías.
 */

export const STICKERS_CATALOG = {json.dumps(catalog_items, indent=4, ensure_ascii=False)};

export function getStickersSpriteUrl() {{
    const basePath = window.AppBasePath || '';
    return `${{basePath}}/assets/img/stickers/stickers_sprite.svg`;
}}

export function getStickersList() {{
    const basePath = window.AppBasePath || '';
    const spriteUrl = getStickersSpriteUrl();
    return STICKERS_CATALOG.map(item => ({{
        id: item.id,
        name: item.name,
        category: item.category,
        width: 32,
        height: 32,
        col: item.col,
        row: item.row,
        sx: item.col * 32,
        sy: item.row * 32,
        sw: 32,
        sh: 32,
        file: item.file,
        spriteUrl: spriteUrl,
        spriteClass: `sticker-sprite--${{item.file.replace('.svg', '')}}`,
        dataUrl: `${{basePath}}/assets/img/stickers/${{item.file}}`
    }}));
}}

export function getStickersByCategory(category) {{
    const list = getStickersList();
    if (!category || category === 'all') return list;
    return list.filter(s => s.category === category);
}}

export function getStickerById(id) {{
    const list = getStickersList();
    return list.find(s => s.id === id) || null;
}}
"""

with open(os.path.join(JS_DATA_DIR, "StickersData.js"), "w", encoding="utf-8") as f:
    f.write(stickers_data_js)

print("¡StickersData.js y 120 archivos SVG generados exitosamente!")

# -------------------------------------------------------------------------------------------------
# 2. GENERACIÓN DE FIGURAS GEOMÉTRICAS (103 figuras)
# -------------------------------------------------------------------------------------------------

SHAPES_PATHS = {
    # Basic
    'square': 'M 6 6 H 42 V 42 H 6 Z',
    'rounded_rectangle': 'M 12 6 H 36 A 6 6 0 0 1 42 12 V 36 A 6 6 0 0 1 36 42 H 12 A 6 6 0 0 1 6 36 V 12 A 6 6 0 0 1 12 6 Z',
    'circle': 'M 24 4 A 20 20 0 1 0 24 44 A 20 20 0 1 0 24 4 Z',
    'triangle_up': 'M 24 5 L 43 41 H 5 Z',
    'triangle_down': 'M 24 43 L 5 7 H 43 Z',
    'diamond': 'M 24 4 L 44 24 L 24 44 L 4 24 Z',
    'cross': 'M 18 4 H 30 V 18 H 44 V 30 H 30 V 44 H 18 V 30 H 4 V 18 H 18 Z',
    'barrel': 'M 6 12 Q 24 4 42 12 V 36 Q 24 44 6 36 Z',
    'ticket': 'M 6 6 H 42 V 18 A 6 6 0 0 0 42 30 V 42 H 6 V 30 A 6 6 0 0 0 6 18 Z',
    'parallelogram_right': 'M 14 6 H 44 L 34 42 H 4 Z',
    'parallelogram_left': 'M 4 6 H 34 L 44 42 H 14 Z',
    'trapezoid_up': 'M 14 6 H 34 L 44 42 H 4 Z',
    'trapezoid_down': 'M 4 6 H 44 L 34 42 H 14 Z',
    'shield_u': 'M 6 6 H 42 V 24 C 42 35 24 43 24 43 C 24 43 6 35 6 24 Z',
    'arch': 'M 6 42 V 24 A 18 18 0 0 1 42 24 V 42 Z',
    'triangle_right_angle': 'M 6 6 V 42 H 42 Z',
    'semi_circle': 'M 4 36 H 44 A 20 20 0 0 0 4 36 Z',
    'quarter_circle': 'M 6 42 H 42 A 36 36 0 0 0 6 6 Z',
    'quadrant_ring': 'M 6 42 H 20 A 22 22 0 0 1 42 20 V 6 A 36 36 0 0 0 6 42 Z',
    'semi_ring': 'M 4 36 H 16 A 8 8 0 0 1 32 36 H 44 A 20 20 0 0 0 4 36 Z',

    # Polygons
    'pentagon': 'M 24 4 L 43.02 17.82 L 35.76 40.18 L 12.24 40.18 L 4.98 17.82 Z',
    'hexagon_pointy': 'M 24 4 L 41.32 14 L 41.32 34 L 24 44 L 6.68 34 L 6.68 14 Z',
    'hexagon_flat': 'M 44 24 L 34 41.32 L 14 41.32 L 4 24 L 14 6.68 L 34 6.68 Z',
    'octagon': 'M 42.48 31.65 L 31.65 42.48 L 16.35 42.48 L 5.52 31.65 L 5.52 16.35 L 16.35 5.52 L 31.65 5.52 L 42.48 16.35 Z',
    'chamfer_square': 'M 14 4 H 34 L 44 14 V 34 L 34 44 H 14 L 4 34 V 14 Z',
    'heptagon': 'M 24 4 L 39.64 11.53 L 43.5 28.45 L 32.68 42.02 L 15.32 42.02 L 4.5 28.45 L 8.36 11.53 Z',
    'decagon': 'M 24 4 L 35.76 7.82 L 43.02 17.82 L 43.02 30.18 L 35.76 40.18 L 24 44 L 12.24 40.18 L 4.98 30.18 L 4.98 17.82 L 12.24 7.82 Z',

    # Stars & Badges
    'star_4_sparkle': 'M 24 4 Q 24 24 44 24 Q 24 24 24 44 Q 24 24 4 24 Q 24 24 24 4 Z',
    'star_5': 'M 24 4 L 29 17.12 L 43.02 17.82 L 32.08 26.63 L 35.76 40.18 L 24 32.5 L 12.24 40.18 L 15.92 26.63 L 4.98 17.82 L 19 17.12 Z',
    'star_6': 'M 24 4 L 29.5 14.47 L 41.32 14 L 35 24 L 41.32 34 L 29.5 33.53 L 24 44 L 18.5 33.53 L 6.68 34 L 13 24 L 6.68 14 L 18.5 14.47 Z',
    'star_7': 'M 24 4 L 28.12 15.44 L 39.64 11.53 L 33.26 21.89 L 43.5 28.45 L 31.43 29.92 L 32.68 42.02 L 24 33.5 L 15.32 42.02 L 16.57 29.92 L 4.5 28.45 L 14.74 21.89 L 8.36 11.53 L 19.88 15.44 Z',
    'star_8': 'M 24 4 L 28.97 11.99 L 38.14 9.86 L 36.01 19.03 L 44 24 L 36.01 28.97 L 38.14 38.14 L 28.97 36.01 L 24 44 L 19.03 36.01 L 9.86 38.14 L 11.99 28.97 L 4 24 L 11.99 19.03 L 9.86 9.86 L 19.03 11.99 Z',
    'burst_10': 'M 24 4 L 28.64 9.73 L 35.76 7.82 L 36.14 15.18 L 43.02 17.82 L 39 24 L 43.02 30.18 L 36.14 32.82 L 35.76 40.18 L 28.64 38.27 L 24 44 L 19.36 38.27 L 12.24 40.18 L 11.86 32.82 L 4.98 30.18 L 9 24 L 4.98 17.82 L 11.86 15.18 L 12.24 7.82 L 19.36 9.73 Z',
    'burst_12': 'M 24 4 L 28.14 8.55 L 34 6.68 L 35.31 12.69 L 41.32 14 L 39.45 19.86 L 44 24 L 39.45 28.14 L 41.32 34 L 35.31 35.31 L 34 41.32 L 28.14 39.45 L 24 44 L 19.86 39.45 L 14 41.32 L 12.69 35.31 L 6.68 34 L 8.55 28.14 L 4 24 L 8.55 19.86 L 6.68 14 L 12.69 12.69 L 14 6.68 L 19.86 8.55 Z',
    'burst_16': 'M 24 4 L 27.32 7.33 L 31.65 5.52 L 33.44 9.87 L 38.14 9.86 L 38.13 14.56 L 42.48 16.35 L 40.67 20.68 L 44 24 L 40.67 27.32 L 42.48 31.65 L 38.13 33.44 L 38.14 38.14 L 33.44 38.13 L 31.65 42.48 L 27.32 40.67 L 24 44 L 20.68 40.67 L 16.35 42.48 L 14.56 38.13 L 9.86 38.14 L 9.87 33.44 L 5.52 31.65 L 7.33 27.32 L 4 24 L 7.33 20.68 L 5.52 16.35 L 9.87 14.56 L 9.86 9.86 L 14.56 9.87 L 16.35 5.52 L 20.68 7.33 Z',
    'burst_20': 'M 24 4 L 26.74 6.72 L 30.18 4.98 L 31.94 8.41 L 35.76 7.82 L 36.37 11.63 L 40.18 12.24 L 39.59 16.06 L 43.02 17.82 L 41.28 21.26 L 44 24 L 41.28 26.74 L 43.02 30.18 L 39.59 31.94 L 40.18 35.76 L 36.37 36.37 L 35.76 40.18 L 31.94 39.59 L 30.18 43.02 L 26.74 41.28 L 24 44 L 21.26 41.28 L 17.82 43.02 L 16.06 39.59 L 12.24 40.18 L 11.63 36.37 L 7.82 35.76 L 8.41 31.94 L 4.98 30.18 L 6.72 26.74 L 4 24 L 6.72 21.26 L 4.98 17.82 L 8.41 16.06 L 7.82 12.24 L 11.63 11.63 L 12.24 7.82 L 16.06 8.41 L 17.82 4.98 L 21.26 6.72 Z',
    'burst_24': 'M 24 4 L 26.35 6.15 L 29.18 4.68 L 30.89 7.37 L 34 6.68 L 34.96 9.72 L 38.14 9.86 L 38.28 13.04 L 41.32 14 L 40.63 17.11 L 43.32 18.82 L 41.85 21.65 L 44 24 L 41.85 26.35 L 43.32 29.18 L 40.63 30.89 L 41.32 34 L 38.28 34.96 L 38.14 38.14 L 34.96 38.28 L 34 41.32 L 30.89 40.63 L 29.18 43.32 L 26.35 41.85 L 24 44 L 21.65 41.85 L 18.82 43.32 L 17.11 40.63 L 14 41.32 L 13.04 38.28 L 9.86 38.14 L 9.72 34.96 L 6.68 34 L 7.37 30.89 L 4.68 29.18 L 6.15 26.35 L 4 24 L 6.15 21.65 L 4.68 18.82 L 7.37 17.11 L 6.68 14 L 9.72 13.04 L 9.86 9.86 L 13.04 9.72 L 14 6.68 L 17.11 7.37 L 18.82 4.68 L 21.65 6.15 Z',
    'sparkle_8': 'M 24 3 L 26.3 18.46 L 38.85 9.15 L 29.54 21.7 L 45 24 L 29.54 26.3 L 38.85 38.85 L 26.3 29.54 L 24 45 L 21.7 29.54 L 9.15 38.85 L 18.46 26.3 L 3 24 L 18.46 21.7 L 9.15 9.15 L 21.7 18.46 Z',
    'sparkle_12': 'M 24 3 L 25.29 19.17 L 34.5 5.81 L 27.54 20.46 L 42.19 13.5 L 28.83 22.71 L 45 24 L 28.83 25.29 L 42.19 34.5 L 27.54 27.54 L 34.5 42.19 L 25.29 28.83 L 24 45 L 22.71 28.83 L 13.5 42.19 L 20.46 27.54 L 5.81 34.5 L 19.17 25.29 L 3 24 L 19.17 22.71 L 5.81 13.5 L 20.46 20.46 L 13.5 5.81 L 22.71 19.17 Z',
    'sunburst_16': 'M 24 3 L 25.07 18.61 L 32.04 4.6 L 27.06 19.43 L 38.85 9.15 L 28.57 20.94 L 43.4 15.96 L 29.39 22.93 L 45 24 L 29.39 25.07 L 43.4 32.04 L 28.57 27.06 L 38.85 38.85 L 27.06 28.57 L 32.04 43.4 L 25.07 29.39 L 24 45 L 22.93 29.39 L 15.96 43.4 L 20.94 28.57 L 9.15 38.85 L 19.43 27.06 L 4.6 32.04 L 18.61 25.07 L 3 24 L 18.61 22.93 L 4.6 15.96 L 19.43 20.94 L 9.15 9.15 L 20.94 19.43 L 15.96 4.6 L 22.93 18.61 Z',
    'seal_scallop_32': 'M 24 4 L 25.76 6.09 L 27.9 4.38 L 29.23 6.78 L 31.65 5.52 L 32.49 8.13 L 35.11 7.37 L 35.42 10.09 L 38.14 9.86 L 37.91 12.58 L 40.63 12.89 L 39.87 15.51 L 42.48 16.35 L 41.22 18.77 L 43.62 20.1 L 41.91 22.24 L 44 24 L 41.91 25.76 L 43.62 27.9 L 41.22 29.23 L 42.48 31.65 L 39.87 32.49 L 40.63 35.11 L 37.91 35.42 L 38.14 38.14 L 35.42 37.91 L 35.11 40.63 L 32.49 39.87 L 31.65 42.48 L 29.23 41.22 L 27.9 43.62 L 25.76 41.91 L 24 44 L 22.24 41.91 L 20.1 43.62 L 18.77 41.22 L 16.35 42.48 L 15.51 39.87 L 12.89 40.63 L 12.58 37.91 L 9.86 38.14 L 10.09 35.42 L 7.37 35.11 L 8.13 32.49 L 5.52 31.65 L 6.78 29.23 L 4.38 27.9 L 6.09 25.76 L 4 24 L 6.09 22.24 L 4.38 20.1 L 6.78 18.77 L 5.52 16.35 L 8.13 15.51 L 7.37 12.89 L 10.09 12.58 L 9.86 9.86 L 12.58 10.09 L 12.89 7.37 L 15.51 8.13 L 16.35 5.52 L 18.77 6.78 L 20.1 4.38 L 22.24 6.09 Z',

    # Arrows
    'arrow_right': 'M 4 16 H 24 V 6 L 44 24 L 24 42 V 32 H 4 Z',
    'arrow_left': 'M 44 16 H 24 V 6 L 4 24 L 24 42 V 32 H 44 Z',
    'arrow_up': 'M 16 44 V 24 H 6 L 24 4 L 42 24 H 32 V 44 Z',
    'arrow_down': 'M 16 4 V 24 H 6 L 24 44 L 42 24 H 32 V 4 Z',
    'arrow_double_horizontal': 'M 16 12 L 4 24 L 16 36 V 28 H 32 V 36 L 44 24 L 32 12 V 20 H 16 Z',
    'arrow_double_vertical': 'M 12 16 L 24 4 L 36 16 H 28 V 32 H 36 L 24 44 L 12 32 H 20 V 16 Z',
    'arrow_ribbon': 'M 4 10 H 30 L 44 24 L 30 38 H 4 Z',
    'chevron_right': 'M 8 6 H 24 L 40 24 L 24 42 H 8 L 24 24 Z',
    'arrow_pointed_left': 'M 44 14 L 32 24 L 44 34 H 24 V 42 L 4 24 L 24 6 V 14 Z',
    'arrow_pointed_double': 'M 14 12 L 4 24 L 14 36 L 8 24 Z M 34 12 L 44 24 L 34 36 L 40 24 Z M 8 20 H 40 V 28 H 8 Z',

    # Flowchart
    'flow_preparation': 'M 12 6 H 36 L 46 24 L 36 42 H 12 L 2 24 Z',
    'flow_terminator': 'M 14 10 H 34 A 14 14 0 0 1 34 38 H 14 A 14 14 0 0 1 14 10 Z',
    'flow_process': 'M 4 10 H 44 V 38 H 4 Z',
    'flow_decision': 'M 24 4 L 44 24 L 24 44 L 4 24 Z',
    'flow_document': 'M 4 6 H 44 V 36 Q 34 30 24 38 Q 14 46 4 38 Z',
    'flow_data': 'M 14 8 H 44 L 34 40 H 4 Z',
    'flow_manual': 'M 4 8 H 44 L 36 40 H 12 Z',
    'flow_delay': 'M 6 8 H 28 A 16 16 0 0 1 28 40 H 6 Z',
    'flow_merge': 'M 24 42 L 4 8 H 44 Z',
    'flow_offpage': 'M 6 8 H 36 L 44 24 L 36 40 H 6 Z',
    'flow_shield': 'M 6 8 H 42 V 32 L 24 42 L 6 32 Z',

    # Callouts
    'callout_rectangular': 'M 4 6 H 44 V 34 H 18 L 8 44 V 34 H 4 Z',
    'callout_oval': 'M 24 6 C 35 6 44 12 44 20 C 44 28 35 34 24 34 C 20 34 16 33 13 31 L 6 38 L 8 28 C 5 26 4 23 4 20 C 4 12 13 6 24 6 Z',
    'callout_cloud': 'M 14 16 C 12 10 20 6 26 8 C 30 5 38 8 38 14 C 43 15 45 23 41 27 C 44 32 39 38 33 37 C 30 40 22 39 20 36 C 15 39 8 34 9 29 C 4 26 6 18 14 16 Z M 10 42 A 2 2 0 1 0 10 38 A 2 2 0 1 0 10 42 Z M 6 45 A 1.5 1.5 0 1 0 6 42 A 1.5 1.5 0 1 0 6 45 Z',
    'callout_rounded_rect': 'M 14 6 H 34 A 8 8 0 0 1 42 14 V 26 A 8 8 0 0 1 34 34 H 18 L 8 44 V 34 H 14 A 8 8 0 0 1 6 26 V 14 A 8 8 0 0 1 14 6 Z',
    'callout_curved_tail': 'M 14 6 H 34 A 8 8 0 0 1 42 14 V 26 A 8 8 0 0 1 34 34 H 18 Q 12 40 6 44 Q 10 38 10 34 H 14 A 8 8 0 0 1 6 26 V 14 A 8 8 0 0 1 14 6 Z',

    # Clouds
    'cloud_puffy_full': 'M 16 16 C 14 10 22 6 28 9 C 33 5 41 9 40 16 C 45 18 46 26 41 30 C 44 36 38 42 32 40 C 28 43 20 42 18 38 C 12 40 6 35 8 29 C 4 24 7 17 16 16 Z',
    'cloud_flat_base_multi': 'M 6 36 H 42 C 45 36 46 31 43 28 C 45 23 41 18 36 19 C 34 13 26 12 23 17 C 20 14 14 15 13 20 C 8 21 6 26 8 31 C 6 33 5 36 6 36 Z',
    'cloud_flat_base_triple': 'M 6 36 H 42 C 45 36 45 28 40 27 C 41 18 29 14 24 19 C 20 15 10 18 10 26 C 6 28 5 36 6 36 Z',
    'cloud_fluffy_soft': 'M 6 36 H 42 C 46 36 45 26 39 25 C 38 16 26 14 22 21 C 18 17 8 20 8 28 C 5 30 5 36 6 36 Z',
    'cloud_round_dome': 'M 8 36 H 40 C 44 36 44 26 38 25 C 36 12 18 12 14 25 C 7 26 6 36 8 36 Z',

    # Hearts
    'heart_classic': 'M 24 40 C 14 30 4 22 4 14 A 10 10 0 0 1 24 10 A 10 10 0 0 1 44 14 C 44 22 34 30 24 40 Z',
    'heart_wide': 'M 24 38 C 12 28 2 21 2 13 A 11 11 0 0 1 24 10 A 11 11 0 0 1 46 13 C 46 21 36 28 24 38 Z',
    'heart_playful': 'M 24 38 C 10 26 4 19 6 12 A 9 9 0 0 1 24 14 A 9 9 0 0 1 42 10 C 45 17 38 26 24 38 Z',
    'heart_rounded': 'M 24 40 C 16 32 6 24 6 16 A 9 9 0 0 1 24 12 A 9 9 0 0 1 42 16 C 42 24 32 32 24 40 Z',
    'heart_narrow': 'M 24 42 C 16 32 8 22 8 13 A 8 8 0 0 1 24 10 A 8 8 0 0 1 40 13 C 40 22 32 32 24 42 Z',

    # Banners
    'banner_horizontal_ribbon': 'M 2 12 L 10 24 L 2 36 H 46 L 38 24 L 46 12 Z',
    'banner_vertical_point': 'M 8 4 H 40 V 34 L 24 44 L 8 34 Z',
    'banner_vertical_notch': 'M 8 4 H 40 V 44 L 24 34 L 8 44 Z',
    'banner_rounded_point': 'M 14 4 H 34 A 6 6 0 0 1 40 10 V 34 L 24 44 L 8 34 V 10 A 6 6 0 0 1 14 4 Z',
    'banner_rounded_notch': 'M 14 4 H 34 A 6 6 0 0 1 40 10 V 44 L 24 34 L 8 44 V 10 A 6 6 0 0 1 14 4 Z',

    # Tears
    'tear_straight': 'M 24 4 C 24 4 8 20 8 28 A 16 16 0 0 0 40 28 C 40 20 24 4 24 4 Z',
    'tear_narrow': 'M 24 4 C 24 4 11 22 11 30 A 13 13 0 0 0 37 30 C 37 22 24 4 24 4 Z',
    'tear_wide': 'M 24 5 C 24 5 6 19 6 26 A 18 18 0 0 0 42 26 C 42 19 24 5 24 5 Z',
    'tear_tilted': 'M 28 4 C 28 4 8 18 8 28 A 15 15 0 0 0 38 38 C 43 33 44 22 28 4 Z',
    'tear_curved_flame': 'M 26 4 C 30 12 18 16 12 24 A 16 16 0 0 0 38 36 C 44 28 38 16 26 4 Z',

    # Gears
    'gear_16_teeth_large_hole': 'M 24 8 L 26.06 3.1 L 28.1 3.4 L 28.64 8.69 L 30.12 9.22 L 33.9 5.48 L 35.67 6.54 L 34.15 11.63 L 35.31 12.69 L 40.23 10.68 L 41.46 12.33 L 38.11 16.46 L 38.78 17.88 L 44.1 17.9 L 44.6 19.9 L 39.92 22.43 L 40 24 L 44.9 26.06 L 44.6 28.1 L 39.31 28.64 L 38.78 30.12 L 42.52 33.9 L 41.46 35.67 L 36.37 34.15 L 35.31 35.31 L 37.32 40.23 L 35.67 41.46 L 31.54 38.11 L 30.12 38.78 L 30.1 44.1 L 28.1 44.6 L 25.57 39.92 L 24 40 L 21.94 44.9 L 19.9 44.6 L 19.36 39.31 L 17.88 38.78 L 14.1 42.52 L 12.33 41.46 L 13.85 36.37 L 12.69 35.31 L 7.77 37.32 L 6.54 35.67 L 9.89 31.54 L 9.22 30.12 L 3.9 30.1 L 3.4 28.1 L 8.08 25.57 L 8 24 L 3.1 21.94 L 3.4 19.9 L 8.69 19.36 L 9.22 17.88 L 5.48 14.1 L 6.54 12.33 L 11.63 13.85 L 12.69 12.69 L 10.68 7.77 L 12.33 6.54 L 16.46 9.89 L 17.88 9.22 L 17.9 3.9 L 19.9 3.4 L 22.43 8.08 Z M 13 24 A 11 11 0 1 0 35 24 A 11 11 0 1 0 13 24 Z',
    'gear_12_teeth_large_hole': 'M 24 9 L 26.74 3.18 L 29.44 3.72 L 29.74 10.14 L 31.5 11.01 L 36.78 7.34 L 38.85 9.15 L 35.9 14.87 L 36.99 16.5 L 43.4 15.96 L 44.28 18.56 L 38.87 22.04 L 39 24 L 44.82 26.74 L 44.28 29.44 L 37.86 29.74 L 36.99 31.5 L 40.66 36.78 L 38.85 38.85 L 33.13 35.9 L 31.5 36.99 L 32.04 43.4 L 29.44 44.28 L 25.96 38.87 L 24 39 L 21.26 44.82 L 18.56 44.28 L 18.26 37.86 L 16.5 36.99 L 11.22 40.66 L 9.15 38.85 L 12.1 33.13 L 11.01 31.5 L 4.6 32.04 L 3.72 29.44 L 9.13 25.96 L 9 24 L 3.18 21.26 L 3.72 18.56 L 10.14 18.26 L 11.01 16.5 L 7.34 11.22 L 9.15 9.15 L 14.87 12.1 L 16.5 11.01 L 15.96 4.6 L 18.56 3.72 L 22.04 9.13 Z M 14 24 A 10 10 0 1 0 34 24 A 10 10 0 1 0 14 24 Z',
    'gear_12_teeth_pointed': 'M 24 3 L 27.62 10.48 L 34.5 5.81 L 33.9 14.1 L 42.19 13.5 L 37.52 20.38 L 45 24 L 37.52 27.62 L 42.19 34.5 L 33.9 33.9 L 34.5 42.19 L 27.62 37.52 L 24 45 L 20.38 37.52 L 13.5 42.19 L 14.1 33.9 L 5.81 34.5 L 10.48 27.62 L 3 24 L 10.48 20.38 L 5.81 13.5 L 14.1 14.1 L 13.5 5.81 L 20.38 10.48 Z M 16 24 A 8 8 0 1 0 32 24 A 8 8 0 1 0 16 24 Z',
    'gear_16_teeth_pointed': 'M 24 3 L 26.93 9.29 L 32.04 4.6 L 32.33 11.53 L 38.85 9.15 L 36.47 15.67 L 43.4 15.96 L 38.71 21.07 L 45 24 L 38.71 26.93 L 43.4 32.04 L 36.47 32.33 L 38.85 38.85 L 32.33 36.47 L 32.04 43.4 L 26.93 38.71 L 24 45 L 21.07 38.71 L 15.96 43.4 L 15.67 36.47 L 9.15 38.85 L 11.53 32.33 L 4.6 32.04 L 9.29 26.93 L 3 24 L 9.29 21.07 L 4.6 15.96 L 11.53 15.67 L 9.15 9.15 L 15.67 11.53 L 15.96 4.6 L 21.07 9.29 Z M 16 24 A 8 8 0 1 0 32 24 A 8 8 0 1 0 16 24 Z',
    'gear_12_teeth_small_hole': 'M 24 9 L 26.74 3.18 L 29.44 3.72 L 29.74 10.14 L 31.5 11.01 L 36.78 7.34 L 38.85 9.15 L 35.9 14.87 L 36.99 16.5 L 43.4 15.96 L 44.28 18.56 L 38.87 22.04 L 39 24 L 44.82 26.74 L 44.28 29.44 L 37.86 29.74 L 36.99 31.5 L 40.66 36.78 L 38.85 38.85 L 33.13 35.9 L 31.5 36.99 L 32.04 43.4 L 29.44 44.28 L 25.96 38.87 L 24 39 L 21.26 44.82 L 18.56 44.28 L 18.26 37.86 L 16.5 36.99 L 11.22 40.66 L 9.15 38.85 L 12.1 33.13 L 11.01 31.5 L 4.6 32.04 L 3.72 29.44 L 9.13 25.96 L 9 24 L 3.18 21.26 L 3.72 18.56 L 10.14 18.26 L 11.01 16.5 L 7.34 11.22 L 9.15 9.15 L 14.87 12.1 L 16.5 11.01 L 15.96 4.6 L 18.56 3.72 L 22.04 9.13 Z M 20 24 A 4 4 0 1 0 28 24 A 4 4 0 1 0 20 24 Z',
    'gear_14_teeth_pointed': 'M 24 3 L 27.12 10.35 L 33.11 5.08 L 32.73 13.05 L 40.42 10.91 L 36.61 17.93 L 44.47 19.33 L 38 24 L 44.47 28.67 L 36.61 30.07 L 40.42 37.09 L 32.73 34.95 L 33.11 42.92 L 27.12 37.65 L 24 45 L 20.88 37.65 L 14.89 42.92 L 15.27 34.95 L 7.58 37.09 L 11.39 30.07 L 3.53 28.67 L 10 24 L 3.53 19.33 L 11.39 17.93 L 7.58 10.91 L 15.27 13.05 L 14.89 5.08 L 20.88 10.35 Z M 18 24 A 6 6 0 1 0 30 24 A 6 6 0 1 0 18 24 Z',

    # Nature
    'flower_8_petals_sharp': 'M 24 3 L 26.68 17.53 L 38.85 9.15 L 30.47 21.32 L 45 24 L 30.47 26.68 L 38.85 38.85 L 26.68 30.47 L 24 45 L 21.32 30.47 L 9.15 38.85 L 17.53 26.68 L 3 24 L 17.53 21.32 L 9.15 9.15 L 21.32 17.53 Z',
    'flower_6_petals_drop': 'M 24 4 C 21 12 21 16 24 24 C 27 16 27 12 24 4 Z M 41 14 C 33 16 30 19 24 24 C 32 23 35 21 41 14 Z M 41 34 C 35 27 32 25 24 24 C 30 29 33 32 41 34 Z M 24 44 C 27 36 27 32 24 24 C 21 32 21 36 24 44 Z M 7 34 C 15 32 18 29 24 24 C 16 25 13 27 7 34 Z M 7 14 C 13 21 16 23 24 24 C 18 19 15 16 7 14 Z',
    'flower_8_petals_round': 'M 24 3 L 29.36 11.07 L 38.85 9.15 L 36.93 18.64 L 45 24 L 36.93 29.36 L 38.85 38.85 L 29.36 36.93 L 24 45 L 18.64 36.93 L 9.15 38.85 L 11.07 29.36 L 3 24 L 11.07 18.64 L 9.15 9.15 L 18.64 11.07 Z',
    'flower_6_petals_center_hole': 'M 24 11 L 29.44 3.72 L 34.5 5.81 L 33.19 14.81 L 35.26 17.5 L 44.28 18.56 L 45 24 L 36.56 27.36 L 35.26 30.5 L 38.85 38.85 L 34.5 42.19 L 27.36 36.56 L 24 37 L 18.56 44.28 L 13.5 42.19 L 14.81 33.19 L 12.74 30.5 L 3.72 29.44 L 3 24 L 11.44 20.64 L 12.74 17.5 L 9.15 9.15 L 13.5 5.81 L 20.64 11.44 Z M 20 24 A 4 4 0 1 0 28 24 A 4 4 0 1 0 20 24 Z',
    'clover_4_leaves': 'M 24 24 C 16 20 8 16 12 8 C 16 4 20 8 24 16 C 28 8 32 4 36 8 C 40 16 32 20 24 24 C 28 32 32 40 36 36 C 40 28 32 28 24 24 C 16 28 8 28 12 36 C 16 40 20 32 24 24 Z',
    'flower_4_petals_cross': 'M 24 24 C 18 18 14 8 24 4 C 34 8 30 18 24 24 C 30 30 40 26 44 36 C 36 46 30 30 24 24 C 18 30 8 34 4 24 C 14 14 18 30 24 24 Z',
    'leaf_curved': 'M 6 42 Q 6 6 42 6 Q 42 42 6 42 Z',
    'wave_multi_ribbon': 'M 4 20 Q 10 14 18 20 T 32 20 T 44 20 V 28 Q 38 22 30 28 T 16 28 T 4 28 Z',
    'wave_s_curve': 'M 4 18 Q 14 8 24 18 T 44 18 V 26 Q 34 16 24 26 T 4 26 Z'
}

# Generar cada SVG de figura geométrica en public/assets/img/shapes/
for shape_id, path_d in SHAPES_PATHS.items():
    svg_file = os.path.join(SHAPES_DIR, f"{shape_id}.svg")
    svg_markup = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="{path_d}" />
</svg>"""
    with open(svg_file, "w", encoding="utf-8") as f:
        f.write(svg_markup)
        
    # Versión rellena si aplica
    fill_file = os.path.join(SHAPES_DIR, f"{shape_id}_fill.svg")
    svg_fill_markup = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="currentColor">
    <path d="{path_d}" fill-rule="evenodd" />
</svg>"""
    with open(fill_file, "w", encoding="utf-8") as f:
        f.write(svg_fill_markup)

# Generar ShapeSvgPathsData.js
js_lines = ["export const SHAPE_SVG_PATHS = {"]
for shape_id in sorted(SHAPES_PATHS.keys()):
    js_lines.append(f"    '{shape_id}': '{SHAPES_PATHS[shape_id]}',")
js_lines.append("};")
js_lines.append("")

with open(os.path.join(JS_DATA_DIR, "ShapeSvgPathsData.js"), "w", encoding="utf-8") as f:
    f.write("\n".join(js_lines))

print(f"¡ShapeSvgPathsData.js y {len(SHAPES_PATHS)} figuras geométricas generadas exitosamente!")
