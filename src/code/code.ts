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
        type: 'findPageResults',
        pageName: currentPage.name,
        pageId: currentPage.id,
        results: results,
        count: results.length
      });

      console.log(`Found ${results.length} external library usages on page "${currentPage.name}"`);
      console.log(results);
      
    } catch (error) {
      console.error('Error finding external usages:', error);
      figma.ui.postMessage({
        type: 'findPageError',
        error: String(error)
      });
    }
  }
};
