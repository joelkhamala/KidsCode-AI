import React, { useEffect, useRef, useCallback } from 'react';

/**
 * AdultBlocklyEditor
 * A self-contained Blockly workspace for adult learners.
 * Uses the Blockly CDN scripts already loaded in index.html.
 *
 * Props:
 *   onCodeChange(jsCode: string) — called whenever blocks change
 *   initialXml?: string         — saved XML to restore workspace state
 *   onXmlChange(xml: string)    — called with the current workspace XML
 *   height?: string             — CSS height of the workspace (default '400px')
 */
const AdultBlocklyEditor = ({ onCodeChange, initialXml, onXmlChange, height = '420px' }) => {
  const containerRef = useRef(null);
  const workspaceRef = useRef(null);

  // ─── Toolbox ──────────────────────────────────────────────────────────────
  const getToolbox = () => ({
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category', name: '📤 Output', colour: '#6366f1',
        contents: [
          { kind: 'block', type: 'text_print' },
          { kind: 'block', type: 'text' },
          { kind: 'block', type: 'text_join' },
          { kind: 'block', type: 'text_length' },
          { kind: 'block', type: 'text_isEmpty' },
          { kind: 'block', type: 'text_indexOf' },
          { kind: 'block', type: 'text_charAt' },
        ]
      },
      {
        kind: 'category', name: '🔢 Math', colour: '#10b981',
        contents: [
          { kind: 'block', type: 'math_number' },
          { kind: 'block', type: 'math_arithmetic' },
          { kind: 'block', type: 'math_random_int' },
          { kind: 'block', type: 'math_random_float' },
          { kind: 'block', type: 'math_modulo' },
          { kind: 'block', type: 'math_round' },
          { kind: 'block', type: 'math_single' },
          { kind: 'block', type: 'math_trig' },
          { kind: 'block', type: 'math_constant' },
          { kind: 'block', type: 'math_number_property' },
          { kind: 'block', type: 'math_constrain' },
        ]
      },
      {
        kind: 'category', name: '🔄 Loops', colour: '#f59e0b',
        contents: [
          { kind: 'block', type: 'controls_repeat_ext' },
          { kind: 'block', type: 'controls_for' },
          { kind: 'block', type: 'controls_forEach' },
          { kind: 'block', type: 'controls_whileUntil' },
          { kind: 'block', type: 'controls_flow_statements' },
        ]
      },
      {
        kind: 'category', name: '❓ Logic', colour: '#ec4899',
        contents: [
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'controls_ifelse' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
          { kind: 'block', type: 'logic_boolean' },
          { kind: 'block', type: 'logic_negate' },
          { kind: 'block', type: 'logic_null' },
          { kind: 'block', type: 'logic_ternary' },
        ]
      },
      {
        kind: 'category', name: '📦 Variables', colour: '#8b5cf6',
        custom: 'VARIABLE',
      },
      {
        kind: 'category', name: '📋 Lists', colour: '#f97316',
        contents: [
          { kind: 'block', type: 'lists_create_with' },
          { kind: 'block', type: 'lists_length' },
          { kind: 'block', type: 'lists_isEmpty' },
          { kind: 'block', type: 'lists_indexOf' },
          { kind: 'block', type: 'lists_getIndex' },
          { kind: 'block', type: 'lists_setIndex' },
          { kind: 'block', type: 'lists_getSublist' },
          { kind: 'block', type: 'lists_sort' },
          { kind: 'block', type: 'lists_reverse' },
          { kind: 'block', type: 'lists_join' },
          { kind: 'block', type: 'lists_split' },
        ]
      },
      {
        kind: 'category', name: '🔧 Functions', colour: '#06b6d4',
        custom: 'PROCEDURE',
      },
      {
        kind: 'sep',
      },
      // ── HTML ──────────────────────────────────────────────────────────────
      {
        kind: 'category', name: '🏗️ HTML', colour: '#e34c26',
        contents: [
          // Basic structure
          { kind: 'block', type: 'html_element' },
          { kind: 'block', type: 'html_heading' },
          { kind: 'block', type: 'html_paragraph' },
          { kind: 'block', type: 'html_button' },
          { kind: 'block', type: 'html_input' },
          { kind: 'block', type: 'html_image' },
          { kind: 'block', type: 'html_link' },
          { kind: 'block', type: 'html_span' },
          { kind: 'block', type: 'html_div_class' },
          { kind: 'block', type: 'html_list' },
          { kind: 'block', type: 'html_list_item' },
          { kind: 'block', type: 'html_concat' },
          { kind: 'sep' },
          // Styled variants
          { kind: 'block', type: 'html_heading_styled' },
          { kind: 'block', type: 'html_paragraph_styled' },
          { kind: 'block', type: 'html_div_styled' },
          { kind: 'block', type: 'html_button_styled' },
          { kind: 'block', type: 'html_span_styled' },
          { kind: 'sep' },
          // Page actions
          { kind: 'block', type: 'html_inject_body' },
          { kind: 'block', type: 'html_append_element' },
          { kind: 'block', type: 'html_export_to_editor' },
        ]
      },
      // ── CSS ──────────────────────────────────────────────────────────────
      {
        kind: 'category', name: '🎨 CSS', colour: '#264de4',
        contents: [
          { kind: 'block', type: 'css_apply' },
          { kind: 'block', type: 'css_rule' },
          { kind: 'block', type: 'css_export_to_editor' },
          { kind: 'sep' },
          { kind: 'block', type: 'css_property_color' },
          { kind: 'block', type: 'css_property_background' },
          { kind: 'block', type: 'css_property_font_size' },
          { kind: 'block', type: 'css_property_font_weight' },
          { kind: 'block', type: 'css_property_text_align' },
          { kind: 'block', type: 'css_property_margin' },
          { kind: 'block', type: 'css_property_padding' },
          { kind: 'block', type: 'css_property_border' },
          { kind: 'block', type: 'css_property_border_radius' },
          { kind: 'block', type: 'css_property_display' },
          { kind: 'block', type: 'css_property_width' },
          { kind: 'block', type: 'css_property_height' },
          { kind: 'block', type: 'css_color_value' },
        ]
      },
      // ── Inline Style ────────────────────────────────────────────────────
      {
        kind: 'category', name: '✨ Inline Style', colour: '#f97316',
        contents: [
          { kind: 'block', type: 'html_style_prop' },
          { kind: 'block', type: 'html_style_join' },
        ]
      },
      {
        kind: 'sep',
      },
      {
        kind: 'category', name: '🌐 DOM', colour: '#0ea5e9',
        contents: [
          { kind: 'block', type: 'adult_dom_getElementById' },
          { kind: 'block', type: 'adult_dom_setInnerHTML' },
          { kind: 'block', type: 'adult_dom_setTextContent' },
          { kind: 'block', type: 'adult_dom_setStyle' },
          { kind: 'block', type: 'adult_dom_addClass' },
          { kind: 'block', type: 'adult_dom_createElement' },
          { kind: 'block', type: 'adult_dom_appendChild' },
          { kind: 'block', type: 'adult_dom_addEventListener' },
        ]
      },
      {
        kind: 'category', name: '⏱️ Timing', colour: '#d97706',
        contents: [
          { kind: 'block', type: 'adult_timer_setTimeout' },
          { kind: 'block', type: 'adult_timer_setInterval' },
          { kind: 'block', type: 'adult_timer_clearInterval' },
        ]
      },
      {
        kind: 'category', name: '🎨 Console', colour: '#64748b',
        contents: [
          { kind: 'block', type: 'adult_console_log' },
          { kind: 'block', type: 'adult_console_warn' },
          { kind: 'block', type: 'adult_console_error' },
          { kind: 'block', type: 'adult_alert' },
        ]
      },
    ]
  });

  // ─── Custom Block Definitions ──────────────────────────────────────────────
  const defineCustomBlocks = useCallback(() => {
    const B = window.Blockly;
    if (!B) return;

    const blocks = {
      // DOM
      adult_dom_getElementById: {
        message0: 'get element by id %1',
        args0: [{ type: 'input_value', name: 'ID', check: 'String' }],
        output: null, colour: 200,
        tooltip: 'document.getElementById(id)',
      },
      adult_dom_setInnerHTML: {
        message0: 'set innerHTML of %1 to %2',
        args0: [
          { type: 'input_value', name: 'ELEMENT' },
          { type: 'input_value', name: 'HTML', check: 'String' },
        ],
        previousStatement: null, nextStatement: null, colour: 200,
        tooltip: 'element.innerHTML = value',
      },
      adult_dom_setTextContent: {
        message0: 'set text of %1 to %2',
        args0: [
          { type: 'input_value', name: 'ELEMENT' },
          { type: 'input_value', name: 'TEXT', check: 'String' },
        ],
        previousStatement: null, nextStatement: null, colour: 200,
      },
      adult_dom_setStyle: {
        message0: 'set style %1 of %2 to %3',
        args0: [
          { type: 'field_input', name: 'PROP', text: 'color' },
          { type: 'input_value', name: 'ELEMENT' },
          { type: 'input_value', name: 'VALUE', check: 'String' },
        ],
        previousStatement: null, nextStatement: null, colour: 200,
      },
      adult_dom_addClass: {
        message0: 'add class %1 to %2',
        args0: [
          { type: 'input_value', name: 'CLASS', check: 'String' },
          { type: 'input_value', name: 'ELEMENT' },
        ],
        previousStatement: null, nextStatement: null, colour: 200,
      },
      adult_dom_createElement: {
        message0: 'create element %1',
        args0: [{ type: 'field_input', name: 'TAG', text: 'div' }],
        output: null, colour: 200,
      },
      adult_dom_appendChild: {
        message0: 'append %1 to %2',
        args0: [
          { type: 'input_value', name: 'CHILD' },
          { type: 'input_value', name: 'PARENT' },
        ],
        previousStatement: null, nextStatement: null, colour: 200,
      },
      adult_dom_addEventListener: {
        message0: 'when %1 fires %2 on %3 do %4',
        args0: [
          { type: 'field_dropdown', name: 'EVENT', options: [['click','click'],['mouseover','mouseover'],['keyup','keyup'],['change','change'],['submit','submit']] },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'ELEMENT' },
          { type: 'input_statement', name: 'DO' },
        ],
        previousStatement: null, nextStatement: null, colour: 200,
      },
      // Timing
      adult_timer_setTimeout: {
        message0: 'after %1 ms do %2',
        args0: [
          { type: 'input_value', name: 'MS', check: 'Number' },
          { type: 'input_statement', name: 'DO' },
        ],
        previousStatement: null, nextStatement: null, colour: 210,
      },
      adult_timer_setInterval: {
        message0: 'every %1 ms do %2',
        args0: [
          { type: 'input_value', name: 'MS', check: 'Number' },
          { type: 'input_statement', name: 'DO' },
        ],
        output: 'Number', colour: 210,
        tooltip: 'Returns interval ID',
      },
      adult_timer_clearInterval: {
        message0: 'clear interval %1',
        args0: [{ type: 'input_value', name: 'ID', check: 'Number' }],
        previousStatement: null, nextStatement: null, colour: 210,
      },
      // Console
      adult_console_log: {
        message0: 'console.log %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null, nextStatement: null, colour: 100,
      },
      adult_console_warn: {
        message0: 'console.warn %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null, nextStatement: null, colour: 60,
      },
      adult_console_error: {
        message0: 'console.error %1',
        args0: [{ type: 'input_value', name: 'VALUE' }],
        previousStatement: null, nextStatement: null, colour: 0,
      },
      adult_alert: {
        message0: 'alert %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        previousStatement: null, nextStatement: null, colour: 100,
      },

      // ── HTML blocks (output: String) ─────────────────────────────────────
      html_element: {
        message0: '<%1> %2 content %3 </%4>',
        args0: [
          { type: 'field_dropdown', name: 'TAG', options: [['div','div'],['section','section'],['article','article'],['header','header'],['footer','footer'],['main','main'],['nav','nav'],['aside','aside'],['form','form'],['label','label'],['table','table'],['tr','tr'],['td','td'],['th','th']] },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'CONTENT', check: 'String' },
          { type: 'field_dropdown', name: 'TAG2', options: [['div','div'],['section','section'],['article','article'],['header','header'],['footer','footer'],['main','main'],['nav','nav'],['aside','aside'],['form','form'],['label','label'],['table','table'],['tr','tr'],['td','td'],['th','th']] },
        ],
        output: 'String', colour: 20,
        tooltip: 'Creates an HTML element string',
      },
      html_heading: {
        message0: 'heading %1 %2',
        args0: [
          { type: 'field_dropdown', name: 'LEVEL', options: [['H1','h1'],['H2','h2'],['H3','h3'],['H4','h4'],['H5','h5'],['H6','h6']] },
          { type: 'input_value', name: 'TEXT', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_paragraph: {
        message0: 'paragraph %1',
        args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
        output: 'String', colour: 20,
      },
      html_button: {
        message0: 'button id %1 label %2',
        args0: [
          { type: 'input_value', name: 'ID', check: 'String' },
          { type: 'input_value', name: 'LABEL', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_input: {
        message0: 'input type %1 id %2 placeholder %3',
        args0: [
          { type: 'field_dropdown', name: 'TYPE', options: [['text','text'],['number','number'],['email','email'],['password','password'],['checkbox','checkbox'],['radio','radio'],['range','range'],['color','color'],['date','date']] },
          { type: 'input_value', name: 'ID', check: 'String' },
          { type: 'input_value', name: 'PLACEHOLDER', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_image: {
        message0: 'image src %1 alt %2 width %3',
        args0: [
          { type: 'input_value', name: 'SRC', check: 'String' },
          { type: 'input_value', name: 'ALT', check: 'String' },
          { type: 'input_value', name: 'WIDTH', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_link: {
        message0: 'link href %1 text %2',
        args0: [
          { type: 'input_value', name: 'HREF', check: 'String' },
          { type: 'input_value', name: 'TEXT', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_span: {
        message0: 'span class %1 text %2',
        args0: [
          { type: 'input_value', name: 'CLASS', check: 'String' },
          { type: 'input_value', name: 'TEXT', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_div_class: {
        message0: 'div with id %1 class %2 content %3',
        args0: [
          { type: 'input_value', name: 'ID', check: 'String' },
          { type: 'input_value', name: 'CLASS', check: 'String' },
          { type: 'input_value', name: 'CONTENT', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_list: {
        message0: '%1 list with items %2',
        args0: [
          { type: 'field_dropdown', name: 'TYPE', options: [['unordered (•)','ul'],['ordered (1.)','ol']] },
          { type: 'input_value', name: 'ITEMS', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_list_item: {
        message0: 'list item %1',
        args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
        output: 'String', colour: 20,
      },
      html_concat: {
        message0: 'join HTML %1 and %2',
        args0: [
          { type: 'input_value', name: 'A', check: 'String' },
          { type: 'input_value', name: 'B', check: 'String' },
        ],
        output: 'String', colour: 20,
        tooltip: 'Combine two HTML strings',
      },
      html_inject_body: {
        message0: 'set page body to HTML %1',
        args0: [{ type: 'input_value', name: 'HTML', check: 'String' }],
        previousStatement: null, nextStatement: null, colour: 20,
        tooltip: 'Sets document.body.innerHTML',
      },
      html_append_element: {
        message0: 'append HTML %1 to element id %2',
        args0: [
          { type: 'input_value', name: 'HTML', check: 'String' },
          { type: 'input_value', name: 'ID', check: 'String' },
        ],
        previousStatement: null, nextStatement: null, colour: 20,
      },
      // ── Export to editor: push HTML/CSS back to the parent code editor tabs
      html_export_to_editor: {
        message0: 'update HTML Editor with %1',
        args0: [{ type: 'input_value', name: 'HTML', check: 'String' }],
        previousStatement: null, nextStatement: null, colour: 20,
        tooltip: 'Sends the HTML string to the HTML Editor tab so you can see and edit it',
      },
      css_export_to_editor: {
        message0: 'update CSS Editor with %1',
        args0: [{ type: 'input_value', name: 'CSS', check: 'String' }],
        previousStatement: null, nextStatement: null, colour: 230,
        tooltip: 'Sends the CSS string to the CSS Editor tab so you can see and edit it',
      },

      // ── Styled HTML element blocks ───────────────────────────────────────
      html_heading_styled: {
        message0: 'heading %1 %2 %3 inline style %4',
        args0: [
          { type: 'field_dropdown', name: 'LEVEL', options: [['H1','h1'],['H2','h2'],['H3','h3'],['H4','h4'],['H5','h5'],['H6','h6']] },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'TEXT', check: 'String' },
          { type: 'input_value', name: 'STYLE', check: 'String' },
        ],
        output: 'String', colour: 20,
        tooltip: 'Heading with inline style="..."',
      },
      html_paragraph_styled: {
        message0: 'paragraph %1 inline style %2',
        args0: [
          { type: 'input_value', name: 'TEXT', check: 'String' },
          { type: 'input_value', name: 'STYLE', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_div_styled: {
        message0: 'div id %1 %2 content %3 %4 inline style %5',
        args0: [
          { type: 'input_value', name: 'ID', check: 'String' },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'CONTENT', check: 'String' },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'STYLE', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_button_styled: {
        message0: 'button id %1 label %2 %3 inline style %4',
        args0: [
          { type: 'input_value', name: 'ID', check: 'String' },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'LABEL', check: 'String' },
          { type: 'input_value', name: 'STYLE', check: 'String' },
        ],
        output: 'String', colour: 20,
      },
      html_span_styled: {
        message0: 'span %1 inline style %2',
        args0: [
          { type: 'input_value', name: 'TEXT', check: 'String' },
          { type: 'input_value', name: 'STYLE', check: 'String' },
        ],
        output: 'String', colour: 20,
      },

      // ── Inline Style blocks ──────────────────────────────────────────────
      html_style_prop: {
        message0: 'style: %1 : %2',
        args0: [
          { type: 'field_dropdown', name: 'PROP', options: [
            ['color','color'], ['background-color','background-color'],
            ['background','background'], ['font-size','font-size'],
            ['font-weight','font-weight'], ['font-family','font-family'],
            ['text-align','text-align'], ['text-decoration','text-decoration'],
            ['margin','margin'], ['margin-top','margin-top'], ['margin-bottom','margin-bottom'],
            ['padding','padding'], ['padding-top','padding-top'],
            ['border','border'], ['border-radius','border-radius'],
            ['width','width'], ['height','height'],
            ['display','display'], ['opacity','opacity'],
            ['cursor','cursor'], ['box-shadow','box-shadow'],
            ['transition','transition'], ['transform','transform'],
          ]},
          { type: 'input_value', name: 'VALUE', check: 'String' },
        ],
        output: 'String', colour: 35,
        tooltip: 'A single CSS property for inline styles e.g. color: red;',
      },
      html_style_join: {
        message0: 'combine styles %1 + %2',
        args0: [
          { type: 'input_value', name: 'A', check: 'String' },
          { type: 'input_value', name: 'B', check: 'String' },
        ],
        output: 'String', colour: 35,
        tooltip: 'Merge two inline style strings e.g. "color: red;" + "font-size: 2em;"',
      },

      // ── CSS blocks ───────────────────────────────────────────────────────
      css_apply: {
        message0: 'apply CSS styles %1',
        args0: [{ type: 'input_value', name: 'CSS', check: 'String' }],
        previousStatement: null, nextStatement: null, colour: 230,
        tooltip: 'Injects a <style> tag with the given CSS into the document head',
      },
      css_rule: {
        message0: 'CSS rule for %1 %2 properties %3',
        args0: [
          { type: 'input_value', name: 'SELECTOR', check: 'String' },
          { type: 'input_dummy' },
          { type: 'input_value', name: 'PROPS', check: 'String' },
        ],
        output: 'String', colour: 230,
        tooltip: 'e.g. selector { color: red; }',
      },
      css_property_color: {
        message0: 'color: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_background: {
        message0: 'background: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_font_size: {
        message0: 'font-size: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_font_weight: {
        message0: 'font-weight: %1',
        args0: [{ type: 'field_dropdown', name: 'VALUE', options: [['normal','normal'],['bold','bold'],['lighter','lighter'],['100','100'],['400','400'],['700','700'],['900','900']] }],
        output: 'String', colour: 230,
      },
      css_property_text_align: {
        message0: 'text-align: %1',
        args0: [{ type: 'field_dropdown', name: 'VALUE', options: [['left','left'],['center','center'],['right','right'],['justify','justify']] }],
        output: 'String', colour: 230,
      },
      css_property_margin: {
        message0: 'margin: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_padding: {
        message0: 'padding: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_border: {
        message0: 'border: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_border_radius: {
        message0: 'border-radius: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_display: {
        message0: 'display: %1',
        args0: [{ type: 'field_dropdown', name: 'VALUE', options: [['block','block'],['inline','inline'],['inline-block','inline-block'],['flex','flex'],['grid','grid'],['none','none']] }],
        output: 'String', colour: 230,
      },
      css_property_width: {
        message0: 'width: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_property_height: {
        message0: 'height: %1',
        args0: [{ type: 'input_value', name: 'VALUE', check: 'String' }],
        output: 'String', colour: 230,
      },
      css_color_value: {
        message0: 'color value %1',
        args0: [{ type: 'field_colour', name: 'COLOR', colour: '#ff0000' }],
        output: 'String', colour: 230,
        tooltip: 'Pick a colour',
      },
    };

    Object.entries(blocks).forEach(([type, def]) => {
      if (!B.Blocks[type]) {
        B.Blocks[type] = { init: function () { this.jsonInit({ ...def, helpUrl: '' }); } };
      }
    });

    // ─── Code generators ────────────────────────────────────────────────────
    const gen = B.javascriptGenerator || B.JavaScript;
    if (!gen) return;

    const OR = gen.ORDER_NONE !== undefined ? gen.ORDER_NONE : 99;

    // Override text_print → console.log
    gen.forBlock['text_print'] = function (block, g) {
      const val = (g || gen).valueToCode(block, 'TEXT', OR) || "''";
      return `console.log(${val});\n`;
    };

    gen.forBlock['adult_dom_getElementById'] = function (block, g) {
      const id = (g || gen).valueToCode(block, 'ID', OR) || "''";
      return [`document.getElementById(${id})`, OR];
    };
    gen.forBlock['adult_dom_setInnerHTML'] = function (block, g) {
      const el = (g || gen).valueToCode(block, 'ELEMENT', OR) || 'null';
      const html = (g || gen).valueToCode(block, 'HTML', OR) || "''";
      return `if(${el}){${el}.innerHTML=${html};}\n`;
    };
    gen.forBlock['adult_dom_setTextContent'] = function (block, g) {
      const el = (g || gen).valueToCode(block, 'ELEMENT', OR) || 'null';
      const txt = (g || gen).valueToCode(block, 'TEXT', OR) || "''";
      return `if(${el}){${el}.textContent=${txt};}\n`;
    };
    gen.forBlock['adult_dom_setStyle'] = function (block, g) {
      const prop = block.getFieldValue('PROP');
      const el = (g || gen).valueToCode(block, 'ELEMENT', OR) || 'null';
      const val = (g || gen).valueToCode(block, 'VALUE', OR) || "''";
      return `if(${el}){${el}.style['${prop}']=${val};}\n`;
    };
    gen.forBlock['adult_dom_addClass'] = function (block, g) {
      const cls = (g || gen).valueToCode(block, 'CLASS', OR) || "''";
      const el = (g || gen).valueToCode(block, 'ELEMENT', OR) || 'null';
      return `if(${el}){${el}.classList.add(${cls});}\n`;
    };
    gen.forBlock['adult_dom_createElement'] = function (block) {
      const tag = block.getFieldValue('TAG');
      return [`document.createElement('${tag}')`, OR];
    };
    gen.forBlock['adult_dom_appendChild'] = function (block, g) {
      const child = (g || gen).valueToCode(block, 'CHILD', OR) || 'null';
      const parent = (g || gen).valueToCode(block, 'PARENT', OR) || 'null';
      return `if(${parent}&&${child}){${parent}.appendChild(${child});}\n`;
    };
    gen.forBlock['adult_dom_addEventListener'] = function (block, g) {
      const event = block.getFieldValue('EVENT');
      const el = (g || gen).valueToCode(block, 'ELEMENT', OR) || 'null';
      const body = (g || gen).statementToCode(block, 'DO');
      return `if(${el}){${el}.addEventListener('${event}',function(event){\n${body}});}\n`;
    };

    gen.forBlock['adult_timer_setTimeout'] = function (block, g) {
      const ms = (g || gen).valueToCode(block, 'MS', OR) || '1000';
      const body = (g || gen).statementToCode(block, 'DO');
      return `setTimeout(function(){\n${body}},${ms});\n`;
    };
    gen.forBlock['adult_timer_setInterval'] = function (block, g) {
      const ms = (g || gen).valueToCode(block, 'MS', OR) || '1000';
      const body = (g || gen).statementToCode(block, 'DO');
      return [`setInterval(function(){\n${body}},${ms})`, OR];
    };
    gen.forBlock['adult_timer_clearInterval'] = function (block, g) {
      const id = (g || gen).valueToCode(block, 'ID', OR) || '0';
      return `clearInterval(${id});\n`;
    };

    gen.forBlock['adult_console_log'] = function (block, g) {
      const val = (g || gen).valueToCode(block, 'VALUE', OR) || "''";
      return `console.log(${val});\n`;
    };
    gen.forBlock['adult_console_warn'] = function (block, g) {
      const val = (g || gen).valueToCode(block, 'VALUE', OR) || "''";
      return `console.warn(${val});\n`;
    };
    gen.forBlock['adult_console_error'] = function (block, g) {
      const val = (g || gen).valueToCode(block, 'VALUE', OR) || "''";
      return `console.error(${val});\n`;
    };
    gen.forBlock['adult_alert'] = function (block, g) {
      const val = (g || gen).valueToCode(block, 'VALUE', OR) || "''";
      return `alert(${val});\n`;
    };

    // ── HTML generators ───────────────────────────────────────────────────
    const v = (block, name, g) => (g || gen).valueToCode(block, name, OR) || "''";

    gen.forBlock['html_element'] = function (block, g) {
      const tag = block.getFieldValue('TAG');
      const content = v(block, 'CONTENT', g);
      return [`'<${tag}>' + ${content} + '</${tag}>'`, OR];
    };
    gen.forBlock['html_heading'] = function (block, g) {
      const lvl = block.getFieldValue('LEVEL');
      const txt = v(block, 'TEXT', g);
      return [`'<${lvl}>' + ${txt} + '</${lvl}>'`, OR];
    };
    gen.forBlock['html_paragraph'] = function (block, g) {
      return [`'<p>' + ${v(block,'TEXT',g)} + '</p>'`, OR];
    };
    gen.forBlock['html_button'] = function (block, g) {
      const id = v(block, 'ID', g);
      const label = v(block, 'LABEL', g);
      return [`'<button id="' + ${id} + '">' + ${label} + '</button>'`, OR];
    };
    gen.forBlock['html_input'] = function (block, g) {
      const type = block.getFieldValue('TYPE');
      const id = v(block, 'ID', g);
      const ph = v(block, 'PLACEHOLDER', g);
      return [`'<input type="${type}" id="' + ${id} + '" placeholder="' + ${ph} + '">'`, OR];
    };
    gen.forBlock['html_image'] = function (block, g) {
      const src = v(block, 'SRC', g);
      const alt = v(block, 'ALT', g);
      const w = v(block, 'WIDTH', g);
      return [`'<img src="' + ${src} + '" alt="' + ${alt} + '" width="' + ${w} + '">'`, OR];
    };
    gen.forBlock['html_link'] = function (block, g) {
      const href = v(block, 'HREF', g);
      const txt = v(block, 'TEXT', g);
      return [`'<a href="' + ${href} + '">' + ${txt} + '</a>'`, OR];
    };
    gen.forBlock['html_span'] = function (block, g) {
      const cls = v(block, 'CLASS', g);
      const txt = v(block, 'TEXT', g);
      return [`'<span class="' + ${cls} + '">' + ${txt} + '</span>'`, OR];
    };
    gen.forBlock['html_div_class'] = function (block, g) {
      const id = v(block, 'ID', g);
      const cls = v(block, 'CLASS', g);
      const content = v(block, 'CONTENT', g);
      return [`'<div id="' + ${id} + '" class="' + ${cls} + '">' + ${content} + '</div>'`, OR];
    };
    gen.forBlock['html_list'] = function (block, g) {
      const type = block.getFieldValue('TYPE');
      const items = v(block, 'ITEMS', g);
      return [`'<${type}>' + ${items} + '</${type}>'`, OR];
    };
    gen.forBlock['html_list_item'] = function (block, g) {
      return [`'<li>' + ${v(block,'TEXT',g)} + '</li>'`, OR];
    };
    gen.forBlock['html_concat'] = function (block, g) {
      return [`(${v(block,'A',g)}) + (${v(block,'B',g)})`, OR];
    };
    gen.forBlock['html_inject_body'] = function (block, g) {
      const html = v(block, 'HTML', g);
      return `document.body.innerHTML = ${html};\n`;
    };
    gen.forBlock['html_append_element'] = function (block, g) {
      const html = v(block, 'HTML', g);
      const id = v(block, 'ID', g);
      return `(function(){var _el=document.getElementById(${id});if(_el)_el.innerHTML+=${html};})();\n`;
    };
    // Export to editor: accumulates in the iframe so multiple blocks combine,
    // sends the running total so parent always REPLACES (not appends)
    gen.forBlock['html_export_to_editor'] = function (block, g) {
      const html = v(block, 'HTML', g);
      return `window.__blk_html__ = (window.__blk_html__ || '') + (${html});\nwindow.parent.postMessage({type:'html_export',html:window.__blk_html__},'*');\n`;
    };
    gen.forBlock['css_export_to_editor'] = function (block, g) {
      const css = v(block, 'CSS', g);
      return `window.parent.postMessage({type:'css_export',css:(${css})},'*');\n`;
    };
    // Styled HTML element generators
    gen.forBlock['html_heading_styled'] = function (block, g) {
      const lvl = block.getFieldValue('LEVEL');
      const txt = v(block, 'TEXT', g);
      const style = v(block, 'STYLE', g);
      return [`'<${lvl} style="' + (${style}) + '">' + (${txt}) + '</${lvl}>'`, OR];
    };
    gen.forBlock['html_paragraph_styled'] = function (block, g) {
      const txt = v(block, 'TEXT', g);
      const style = v(block, 'STYLE', g);
      return [`'<p style="' + (${style}) + '">' + (${txt}) + '</p>'`, OR];
    };
    gen.forBlock['html_div_styled'] = function (block, g) {
      const id = v(block, 'ID', g);
      const content = v(block, 'CONTENT', g);
      const style = v(block, 'STYLE', g);
      return [`'<div id="' + (${id}) + '" style="' + (${style}) + '">' + (${content}) + '</div>'`, OR];
    };
    gen.forBlock['html_button_styled'] = function (block, g) {
      const id = v(block, 'ID', g);
      const label = v(block, 'LABEL', g);
      const style = v(block, 'STYLE', g);
      return [`'<button id="' + (${id}) + '" style="' + (${style}) + '">' + (${label}) + '</button>'`, OR];
    };
    gen.forBlock['html_span_styled'] = function (block, g) {
      const txt = v(block, 'TEXT', g);
      const style = v(block, 'STYLE', g);
      return [`'<span style="' + (${style}) + '">' + (${txt}) + '</span>'`, OR];
    };
    // Inline style generators
    gen.forBlock['html_style_prop'] = function (block, g) {
      const prop = block.getFieldValue('PROP');
      const val = v(block, 'VALUE', g);
      return [`'${prop}: ' + (${val}) + '; '`, OR];
    };
    gen.forBlock['html_style_join'] = function (block, g) {
      return [`(${v(block,'A',g)}) + (${v(block,'B',g)})`, OR];
    };

    // ── CSS generators ────────────────────────────────────────────────────
    gen.forBlock['css_apply'] = function (block, g) {
      const css = v(block, 'CSS', g);
      return `(function(){var _s=document.createElement('style');_s.textContent=${css};document.head.appendChild(_s);})();\n`;
    };
    gen.forBlock['css_rule'] = function (block, g) {
      const sel = v(block, 'SELECTOR', g);
      const props = v(block, 'PROPS', g);
      return [`(${sel}) + ' { ' + (${props}) + ' }'`, OR];
    };
    // Simple property blocks — all follow the same pattern
    const cssPropBlocks = {
      css_property_color: 'color',
      css_property_background: 'background',
      css_property_font_size: 'font-size',
      css_property_margin: 'margin',
      css_property_padding: 'padding',
      css_property_border: 'border',
      css_property_border_radius: 'border-radius',
      css_property_width: 'width',
      css_property_height: 'height',
    };
    Object.entries(cssPropBlocks).forEach(([type, prop]) => {
      gen.forBlock[type] = function (block, g) {
        const val = v(block, 'VALUE', g);
        return [`'${prop}: ' + ${val} + ';'`, OR];
      };
    });
    // Dropdown-only property blocks
    gen.forBlock['css_property_font_weight'] = function (block) {
      return [`'font-weight: ${block.getFieldValue('VALUE')};'`, OR];
    };
    gen.forBlock['css_property_text_align'] = function (block) {
      return [`'text-align: ${block.getFieldValue('VALUE')};'`, OR];
    };
    gen.forBlock['css_property_display'] = function (block) {
      return [`'display: ${block.getFieldValue('VALUE')};'`, OR];
    };
    gen.forBlock['css_color_value'] = function (block) {
      return [`'${block.getFieldValue('COLOR')}'`, OR];
    };
  }, []);

  // ─── Sync code from workspace ──────────────────────────────────────────────
  const syncCode = useCallback(() => {
    const B = window.Blockly;
    const ws = workspaceRef.current;
    if (!B || !ws) return;

    try {
      const gen = B.javascriptGenerator || B.JavaScript;
      if (!gen) return;
      const code = gen.workspaceToCode(ws);
      onCodeChange && onCodeChange(code);

      // Also emit XML for persistence
      const xml = B.Xml.domToText(B.Xml.workspaceToDom(ws));
      onXmlChange && onXmlChange(xml);
    } catch (e) {
      console.warn('BlocklyEditor: sync error', e);
    }
  }, [onCodeChange, onXmlChange]);

  // ─── Mount / Unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    const B = window.Blockly;
    if (!B || !containerRef.current) return;
    if (workspaceRef.current) return; // already mounted

    defineCustomBlocks();

    // Patch document.cookie setter to silently swallow SecurityErrors during Blockly init
    const origDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    try {
      Object.defineProperty(document, 'cookie', {
        get: origDesc?.get,
        set: function (val) {
          try { origDesc?.set?.call(document, val); } catch (e) {
            if (!(e instanceof DOMException && e.name === 'SecurityError')) throw e;
          }
        },
        configurable: true,
      });
    } catch (_) {}

    try {
      workspaceRef.current = B.inject(containerRef.current, {
        toolbox: getToolbox(),
        scrollbars: true,
        trashcan: true,
        zoom: { controls: true, wheel: true, startScale: 0.85 },
        grid: { spacing: 20, length: 3, colour: '#f0f0f0', snap: true },
        sounds: false,
        theme: B.Themes?.Classic || undefined,
      });

      // Restore saved XML
      if (initialXml) {
        try {
          const doc = new DOMParser().parseFromString(initialXml, 'text/xml');
          B.Xml.domToWorkspace(doc.documentElement, workspaceRef.current);
        } catch (_) {}
      }

      workspaceRef.current.addChangeListener((e) => {
        if (e.isUiEvent) return;
        syncCode();
      });

      // Initial sync
      syncCode();
    } catch (e) {
      console.error('AdultBlocklyEditor: init error', e);
    } finally {
      // Restore cookie descriptor
      try { if (origDesc) Object.defineProperty(document, 'cookie', origDesc); } catch (_) {}
    }

    return () => {
      if (workspaceRef.current) {
        try { workspaceRef.current.dispose(); } catch (_) {}
        workspaceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Expose clear method via ref (optional future use) ────────────────────
  const clearWorkspace = () => {
    if (workspaceRef.current) workspaceRef.current.clear();
  };

  return (
    <div className="flex flex-col" style={{ height }}>
      {/* Blockly container */}
      <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
    </div>
  );
};

export default AdultBlocklyEditor;
