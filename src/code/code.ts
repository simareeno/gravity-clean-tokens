import { ExternalUsage, traverseNode } from './checkExternalUsages';

console.clear();
figma.showUI(__html__, { width: 700, height: 700 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'findPage') {
    try {
      const currentPage = figma.currentPage;
      const results: ExternalUsage[] = [];

      // Traverse all nodes on the current page
      traverseNode(currentPage, results);

      // Send results back to UI
      figma.ui.postMessage({
        type: 'findResults',
        scope: 'page',
        scopeName: currentPage.name,
        scopeId: currentPage.id,
        results: results,
        count: results.length
      });

      console.log(`Found ${results.length} external library usages on page "${currentPage.name}"`);
      console.log(results);
      
    } catch (error) {
      console.error('Error finding external usages:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  } else if (msg.type === 'findSelection') {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'findError',
          error: 'No elements selected. Please select at least one element.'
        });
        return;
      }

      const results: ExternalUsage[] = [];

      // Traverse all selected nodes
      for (const node of selection) {
        traverseNode(node, results);
      }

      // Send results back to UI
      figma.ui.postMessage({
        type: 'findResults',
        scope: 'selection',
        scopeName: `${selection.length} selected element${selection.length > 1 ? 's' : ''}`,
        scopeId: null,
        results: results,
        count: results.length
      });

      console.log(`Found ${results.length} external library usages in selection`);
      console.log(results);
      
    } catch (error) {
      console.error('Error finding external usages:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  } else if (msg.type === 'findFile') {
    try {
      const results: ExternalUsage[] = [];

      // Traverse all pages in the document
      for (const page of figma.root.children) {
        traverseNode(page, results);
      }

      // Send results back to UI
      figma.ui.postMessage({
        type: 'findResults',
        scope: 'file',
        scopeName: figma.root.name,
        scopeId: figma.root.id,
        results: results,
        count: results.length
      });

      console.log(`Found ${results.length} external library usages in entire file`);
      console.log(results);
      
    } catch (error) {
      console.error('Error finding external usages:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  }
};
