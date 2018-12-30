function walk(rootNode)
{
  // Find all the text nodes in rootNode
  var walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    null,
    false
  ),
  node;

  // Modify each text node's value
  while (node = walker.nextNode()) {
    handleText(node);
  }
}

function handleText(textNode) {
  textNode.nodeValue = translate(textNode.nodeValue);
}

function translateWord(text, tweetSpeak, translation)
{
  var needle = new RegExp("\\b(" + tweetSpeak + ")(\\b(?!\\s\\[))", "ig");
  return text.replace(needle, "$1 [" + translation + "]$2");
}

function translate(text)
{
  return dictionary.reduce(
    function(partialTranslation, entry) {
      var tweetSpeak = entry[0];
      var english = entry[1];
      return translateWord(partialTranslation, tweetSpeak, english)
    },
    text,
  );
}

// Returns true if a node should *not* be altered in any way
function isForbiddenNode(node) {
  return node.isContentEditable || // DraftJS and many others
  (node.parentNode && node.parentNode.isContentEditable) || // Special case for Gmail
  (node.tagName && (node.tagName.toLowerCase() == "textarea" || // Some catch-alls
  node.tagName.toLowerCase() == "input"));
}

// The callback used for the document body and title observers
function observerCallback(mutations) {
  var i, node;

  mutations.forEach(function(mutation) {
    for (i = 0; i < mutation.addedNodes.length; i++) {
      node = mutation.addedNodes[i];
      if (isForbiddenNode(node)) {
        // Should never operate on user-editable content
        continue;
      } else if (node.nodeType === 3) {
        // Replace the text for text nodes
        handleText(node);
      } else {
        // Otherwise, find text nodes within the given node and replace text
        walk(node);
      }
    }
  });
}

// Walk the doc (document) body, replace the title, and observe the body and title
function walkAndObserve(doc) {
  var docTitle = doc.getElementsByTagName('title')[0],
  observerConfig = {
    characterData: true,
    childList: true,
    subtree: true
  },
  bodyObserver, titleObserver;

  // Do the initial text replacements in the document body and title
  walk(doc.body);
  doc.title = translate(doc.title);

  // Observe the body so that we replace text in any added/modified nodes
  bodyObserver = new MutationObserver(observerCallback);
  bodyObserver.observe(doc.body, observerConfig);

  // Observe the title so we can handle any modifications there
  if (docTitle) {
    titleObserver = new MutationObserver(observerCallback);
    titleObserver.observe(docTitle, observerConfig);
  }
}
walkAndObserve(document);
