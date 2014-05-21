// ==UserScript==
// @name          RPNet MultiCopy
// @namespace     erosman
// @description   Copy Multiple Text Links and URLs
// @updateURL     https://github.com/erosman/RPNetMultiCopy/blob/master/RPNetMultiCopy.user.js
// @downloadURL   https://github.com/erosman/RPNetMultiCopy/blob/master/RPNetMultiCopy.user.js
// @include       https://premium.rpnet.biz/usercp.php?action=downloader
// @include       http://ld.rtify.com/*
// @include       http://www.embedupload.com/?*
// @exclude       http://www.embedupload.com/?d=*
// @include       http://www.keeplinks.me/p/*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_setClipboard
// @author        erosman
// @version       1.6
// ==/UserScript==

/* --------- Note ---------
  This script allows to Copy/Paste links into RPNet textarea.
  It grabs the URLs (both plain text & hyperlink) from the highlighted section on any page.
  It appends new copied URLs from single or multiple pages until it is pasted in
  RPNet textarea or clipboard (Firefox only) and then it clears the data.
  The added Context Menu command (right mouse click on page),
  is only supported by Firefox at the moment.

  Features:
  - Works on any site
  - Works with both Text URLs and Hyperlinks
  - Grabs URLs from mixed text (exact selection not necessary)
  - Adds more links from the same site or other sites to storage
  - No limit on the number of links that can be added
  - Removes duplicate URLs
  - Stored data gets cleared after pasting
  - Notification of the stored URLs count
  - Context menu (Firefox only)
  - Save to Clipboard (Firefox only)
  - Automatically clears the RPNet textarea notification before pasting
  - Localized Language

  Few sites has been added to start with:

  To add sites:
  - Go to Add-ons - User Scripts ('Ctrl+ Shift + a' on Firefox)
  - Click on this Script's Option
  - Under User Settings Tab, Add Included/Excluded Pages that you want the script to run on
  - Click OK



  --------- History ---------

  1.6 Added Localized Language Script + Code Improvement + Added alternative textarea for pasting
      + Removed OS based New-Line variants
  1.5 Firefox Code separation + notification on all pages
  1.4 Save to Clipboard Option added (Firefox Only) +  Added OS based New-Line variants
  1.3 Added HTML hyperlink parsing + Added button mouseover notice
  1.2 Added Contex Menu Command (Firefox only)
  1.1 Restyling + Code Improvement
  1.0 Initial release

*/


(function() { // anonymous function wrapper, used for error checking & limiting scope
if (frameElement) { return; } // end execution if in a frame/object/embedding points
'use strict'; // ECMAScript 5


/* default language preset: en */
var textCopy = 'Copy';
var textPaste = 'Paste';
var textClipboard = 'Save to Clipboard';
var titleCopy = 'Select the URLs and Click';
var titlePaste = 'Click to paste the saved URLs';
var titleSaved = 'Links Saved';
var errorSelect = 'Nothing Selected';
var errorCopy = 'Links not found';
var errorPaste = 'Nothing to Paste';

var lang = navigator.language;
lang = lang ? lang[0] + lang[1] : 'en';                 // using the first 2 letters for generic language family
if (lang !== 'en') { setLanguage(); }                   // if not English, set local language

var nl = '\u000a';                                      // Unicode Line Feed

/* URL count for notice display */
var rpnet = GM_getValue('rpnet', '');
var n = rpnet ? rpnet.split('|').length : 0;

// templates
var div = document.createElement('div');

// Note: The HTML5 <menuitem> element is currently ONLY supported in Firefox (at the moment)
var contextMenu = ('contextMenu' in document.body && 'HTMLMenuItemElement' in window) ? 1 : 0;
// contextMenu = 0;

var rp = document.domain === 'premium.rpnet.biz' ? 1 : 0;

switch (contextMenu) {

  case 1:                                               // Firefox
    var menu = document.createElement('menu');
    menu.type = 'context';
    menu.id = 'rpnet';

    var menuitem = document.createElement('menuitem');
    menuitem.icon = 'https://premium.rpnet.biz/favicon.ico';
    var menuitem2 = menuitem.cloneNode(false);

    menuitem.label = 'RPNet ' + (rp ? textPaste : textCopy);
    menuitem.addEventListener('click', (rp ? paste : copy), false);
    menu.appendChild(menuitem);

    menuitem2.label = textClipboard + ' ('  + n + ')';
    menuitem2.addEventListener('click', clipboard, false);
    menu.appendChild(menuitem2);

    document.body.appendChild(menu);
    document.body.setAttribute('contextmenu', 'rpnet');
    break;

    default:                                            // other browsers
    var btn = document.createElement('button');
    btn.setAttribute('style', 'color: #030; font-size: 12px; font-weight: bold; letter-spacing: 1px; ' +
      'border: 1px solid #fff; border-bottom: 0; border-radius: 10px 10px 0 0; padding: 5px; cursor: pointer;' +
      'box-shadow: 0px 3px 10px rgba(0, 0, 0, 0.8); text-shadow: 0px -1px 1px #999, 0px 1px 0px #eee; ' +
      'background: #aaa linear-gradient(to bottom, #ddd, #aaa); position: fixed; right: 10px; bottom: 0; ');

    btn.textContent = 'RPNet ' + (rp ? textPaste : textCopy);
    btn.title = (rp ? titlePaste : titleCopy) + nl + titleSaved + ': ' + n;
    btn.addEventListener('click', (rp ? paste : copy), false);
    (rp ? document.body.children[1] : document.body).appendChild(btn);
}


function copy() {

  var sel = window.getSelection();
  if (!sel.rangeCount) { alert(errorSelect); return; }  // end execution if not found

  /* searching for text URls */
  var txt = sel + '';
  txt = txt.match(/https?:\/\/\S+/g) || [];

  /* searching for hyperlinks */
  div.textContent = '';                                 // reset the div content
  div.appendChild(sel.getRangeAt(0).cloneContents());
  var a = div.getElementsByTagName('a') || [];

  if (!txt[0] && !a[0]) { alert(errorCopy); return; }   // end execution if not found

  var rpnet = GM_getValue('rpnet', '');                 // get previously saved data
  rpnet = rpnet ? rpnet.split('|') : [];

  // adding URLs & removing duplicates
  for (var i = 0, len = txt.length; i < len; i++) {
    if (rpnet.indexOf(txt[i]) === -1) { rpnet.push(txt[i]); }
  }

  for (var i = 0, len = a.length; i < len; i++) {
    if (rpnet.indexOf(a[i].href) === -1) { rpnet.push(a[i].href); }
  }

  GM_setValue('rpnet', rpnet.join('|'));

  notify(rpnet.length);                                 // update notice display
}


function paste() {

  notify(0);                                            // update notice display

  var elem = document.getElementById('links') || document.querySelector('textarea');
  if (!elem) { return; }                                // end execution if not found

  var rpnet = GM_getValue('rpnet', '');
  if (!rpnet) { alert(errorPaste); return; }            // end execution if not found

  rpnet = rpnet.split('|').join(nl);
  // clear the textarea of previous download notice, trim and add new URLs
  elem.value = /HDD download|rpnet.biz/i.test(elem.value) ? '' : elem.value.trim();
  elem.value += (elem.value  ? nl : '') + rpnet;
  GM_setValue('rpnet', '');                             // reset/clear the copied data
}


function clipboard() {

  notify(0);                                            // update notice display

  var rpnet = GM_getValue('rpnet', '');
  if (!rpnet) { alert(errorPaste); return; }            // end execution if not found

  rpnet = rpnet.split('|').join(nl);
  GM_setClipboard(rpnet);
  GM_setValue('rpnet', '');                             // reset/clear the copied data
}


function notify(n) {

  contextMenu ?
  menuitem2.label = menuitem2.label.replace(/\d+/, n) :
  btn.title = btn.title.replace(/\d+/, n);
}


function setLanguage() {

  console.log('Not English');
  return; // end execution now since there are no translations

  // using the first 2 letters for generic language family
  // the following, if set, will override the preset
  switch (lang) {

    case 'fr':
      textCopy = '';
      textPaste = '';
      textClipboard = '';
      titleCopy = '';
      titlePaste = '';
      titleSaved = '';
      errorSelect = '';
      errorCopy = '';
      errorPaste = '';
      break;
  }
}

})(); // end of anonymous function
