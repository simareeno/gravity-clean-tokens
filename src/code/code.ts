import { ExternalUsage, traverseNode } from './checkExternalUsages';

console.clear();
figma.showUI(__html__, { width: 880, height: 700 });

// Restore previous size
figma.clientStorage.getAsync('size').then(size => {
  if (size) figma.ui.resize(size.w, size.h);
}).catch(err => {});

// Helper function to reattach styles on a single node
async function reattachStylesOnNode(node: SceneNode): Promise<number> {
  let reattachedCount = 0;

  // Process Fill style
  if ('fillStyleId' in node && node.fillStyleId && typeof node.fillStyleId === 'string') {
    const fillStyleId = node.fillStyleId;
    
    // Detach style
    await (node as any).setFillStyleIdAsync('');
    
    // Unbind all variables from fills
    if ('fills' in node && Array.isArray(node.fills)) {
      const newFills = node.fills.map((fill: any) => {
        const newFill = { ...fill };
        delete newFill.boundVariables;
        return newFill;
      });
      (node as any).fills = newFills;
    }
    
    // Reattach style
    await (node as any).setFillStyleIdAsync(fillStyleId);
    reattachedCount++;
  }

  // Process Stroke style
  if ('strokeStyleId' in node && node.strokeStyleId && typeof node.strokeStyleId === 'string') {
    const strokeStyleId = node.strokeStyleId;
    
    // Detach style
    await (node as any).setStrokeStyleIdAsync('');
    
    // Unbind all variables from strokes
    if ('strokes' in node && Array.isArray(node.strokes)) {
      const newStrokes = node.strokes.map((stroke: any) => {
        const newStroke = { ...stroke };
        delete newStroke.boundVariables;
        return newStroke;
      });
      (node as any).strokes = newStrokes;
    }
    
    // Reattach style
    await (node as any).setStrokeStyleIdAsync(strokeStyleId);
    reattachedCount++;
  }

  // Process Effect style
  if ('effectStyleId' in node && node.effectStyleId && typeof node.effectStyleId === 'string') {
    const effectStyleId = node.effectStyleId;
    
    // Detach style
    await (node as any).setEffectStyleIdAsync('');
    
    // Unbind all variables from effects
    if ('effects' in node && Array.isArray(node.effects)) {
      const newEffects = node.effects.map((effect: any) => {
        const newEffect = { ...effect };
        delete newEffect.boundVariables;
        return newEffect;
      });
      (node as any).effects = newEffects;
    }
    
    // Reattach style
    await (node as any).setEffectStyleIdAsync(effectStyleId);
    reattachedCount++;
  }

  // Process Grid style
  if ('gridStyleId' in node && node.gridStyleId && typeof node.gridStyleId === 'string') {
    const gridStyleId = node.gridStyleId;
    
    // Detach style
    await (node as any).setGridStyleIdAsync('');
    
    // Unbind all variables from grids
    if ('layoutGrids' in node && Array.isArray(node.layoutGrids)) {
      const newGrids = node.layoutGrids.map((grid: any) => {
        const newGrid = { ...grid };
        delete newGrid.boundVariables;
        return newGrid;
      });
      (node as any).layoutGrids = newGrids;
    }
    
    // Reattach style
    await (node as any).setGridStyleIdAsync(gridStyleId);
    reattachedCount++;
  }

  return reattachedCount;
}

// Helper function to traverse and reattach styles on all nodes
async function traverseAndReattach(node: BaseNode): Promise<number> {
  let count = 0;

  // Process current node if it's a SceneNode
  if ('type' in node && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
    count += await reattachStylesOnNode(node as SceneNode);
  }

  // Recursively process children
  if ('children' in node) {
    for (const child of (node as any).children) {
      count += await traverseAndReattach(child);
    }
  }

  return count;
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'resize') {
    figma.ui.resize(msg.size.w, msg.size.h);
    figma.clientStorage.setAsync('size', msg.size).catch(err => {});
  } else if (msg.type === 'findPage') {
    try {
      const currentPage = figma.currentPage;
      const results: ExternalUsage[] = [];

      // Traverse all nodes on the current page
      await traverseNode(currentPage, results);

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
        await traverseNode(node, results);
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
        await traverseNode(page, results);
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
  } else if (msg.type === 'replaceMatches') {
    try {
      const items = msg.items;
      let replacedCount = 0;

      for (const item of items) {
        const node = await figma.getNodeByIdAsync(item.nodeId);
        if (!node) continue;


        // Find the local match based on type
        let localToken: Variable | BaseStyle | null = null;

        if (item.type.includes('variable')) {
          // Find local variable
          const collections = await figma.variables.getLocalVariableCollectionsAsync();
          for (const collection of collections) {
            for (const variableId of collection.variableIds) {
              const variable = await figma.variables.getVariableByIdAsync(variableId);
              if (variable && variable.name === item.localMatch) {
                localToken = variable;
                break;
              }
            }
            if (localToken) break;
          }

          // Replace variable binding
          if (localToken && 'boundVariables' in node && node.boundVariables) {
            const variable = localToken as Variable;
            const boundVars = node.boundVariables as any;
            
            // Valid fields for setBoundVariable
            const validFields = [
              'height', 'width', 'characters', 'itemSpacing', 'paddingLeft', 'paddingRight',
              'paddingTop', 'paddingBottom', 'visible', 'cornerRadius', 'topLeftRadius',
              'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeWeight',
              'strokeTopWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'strokeRightWeight',
              'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'counterAxisSpacing', 'opacity',
              'gridRowGap', 'gridColumnGap', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight',
              'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent'
            ];
            
            // Find which field is bound to the external variable
            for (const field in boundVars) {
              // Skip fields that can't be set with setBoundVariable
              if (!validFields.includes(field)) {
                continue;
              }
              
              const binding = boundVars[field];
              const bindings = Array.isArray(binding) ? binding : [binding];
              
              for (const alias of bindings) {
                if (alias && alias.id) {
                  const externalVar = await figma.variables.getVariableByIdAsync(alias.id);
                  if (externalVar && externalVar.name === item.name) {
                    const collection = await figma.variables.getVariableCollectionByIdAsync(externalVar.variableCollectionId);
                    if (collection && collection.remote) {
                      // Replace with local variable
                      try {
                        (node as any).setBoundVariable(field, variable);
                        replacedCount++;
                      } catch (error) {
                        console.error(`Error replacing variable binding for field ${field}:`, error);
                      }
                    }
                  }
                }
              }
            }
          }

          // Also check fills, strokes, effects for variable bindings
          if (localToken) {
            const variable = localToken as Variable;
            
            // Check fills
            if ('fills' in node && Array.isArray(node.fills)) {
              for (let fillIndex = 0; fillIndex < node.fills.length; fillIndex++) {
                const fill = node.fills[fillIndex];
                if ('boundVariables' in fill && fill.boundVariables) {
                  for (const field in fill.boundVariables) {
                    const binding = (fill.boundVariables as any)[field];
                    const bindings = Array.isArray(binding) ? binding : [binding];
                    
                    for (const alias of bindings) {
                      if (alias && alias.id) {
                        const externalVar = await figma.variables.getVariableByIdAsync(alias.id);
                        if (externalVar && externalVar.name === item.name) {
                          const collection = await figma.variables.getVariableCollectionByIdAsync(externalVar.variableCollectionId);
                          if (collection && collection.remote) {
                            try {
                              // Use setFillsBoundVariable for fill properties
                              if ('setFillsBoundVariable' in node) {
                                (node as any).setFillsBoundVariable(fillIndex, field, variable);
                                replacedCount++;
                              }
                            } catch (error) {
                              console.error('Error replacing fill variable:', error);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // Check strokes
            if ('strokes' in node && Array.isArray(node.strokes)) {
              for (let strokeIndex = 0; strokeIndex < node.strokes.length; strokeIndex++) {
                const stroke = node.strokes[strokeIndex];
                if ('boundVariables' in stroke && stroke.boundVariables) {
                  for (const field in stroke.boundVariables) {
                    const binding = (stroke.boundVariables as any)[field];
                    const bindings = Array.isArray(binding) ? binding : [binding];
                    
                    for (const alias of bindings) {
                      if (alias && alias.id) {
                        const externalVar = await figma.variables.getVariableByIdAsync(alias.id);
                        if (externalVar && externalVar.name === item.name) {
                          const collection = await figma.variables.getVariableCollectionByIdAsync(externalVar.variableCollectionId);
                          if (collection && collection.remote) {
                            try {
                              // Use setStrokesBoundVariable for stroke properties
                              if ('setStrokesBoundVariable' in node) {
                                (node as any).setStrokesBoundVariable(strokeIndex, field, variable);
                                replacedCount++;
                              }
                            } catch (error) {
                              console.error('Error replacing stroke variable:', error);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            // Check effects - need to clone and modify the effects array
            if ('effects' in node && Array.isArray(node.effects)) {
              // Clone the effects array
              const newEffects = JSON.parse(JSON.stringify(node.effects));
              let effectsModified = false;
              
              for (let effectIndex = 0; effectIndex < newEffects.length; effectIndex++) {
                const effect = newEffects[effectIndex];
                const originalEffect = node.effects[effectIndex];
                
                if ('boundVariables' in originalEffect && originalEffect.boundVariables) {
                  for (const field in originalEffect.boundVariables) {
                    const binding = (originalEffect.boundVariables as any)[field];
                    const bindings = Array.isArray(binding) ? binding : [binding];
                    
                    for (const alias of bindings) {
                      if (alias && alias.id) {
                        const externalVar = await figma.variables.getVariableByIdAsync(alias.id);
                        if (externalVar && externalVar.name === item.name) {
                          const collection = await figma.variables.getVariableCollectionByIdAsync(externalVar.variableCollectionId);
                          if (collection && collection.remote) {
                            try {
                              // Initialize boundVariables if it doesn't exist
                              if (!effect.boundVariables) {
                                effect.boundVariables = {};
                              }
                              
                              // Set the new variable binding
                              effect.boundVariables[field] = {
                                type: 'VARIABLE_ALIAS',
                                id: variable.id
                              };
                              
                              effectsModified = true;
                            } catch (error) {
                              console.error('Error preparing effect variable replacement:', error);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              
              // Apply the modified effects back to the node
              if (effectsModified) {
                try {
                  (node as any).effects = newEffects;
                  replacedCount++;
                } catch (error) {
                  console.error('Error applying modified effects:', error);
                }
              }
            }
          }
        } else if (item.type.includes('style')) {
          // Find local style
          let localStyles: BaseStyle[] = [];
          
          if (item.type === 'text style') {
            localStyles = await figma.getLocalTextStylesAsync();
          } else if (item.type === 'paint style') {
            localStyles = await figma.getLocalPaintStylesAsync();
          } else if (item.type === 'effect style') {
            localStyles = await figma.getLocalEffectStylesAsync();
          } else if (item.type === 'grid style') {
            localStyles = await figma.getLocalGridStylesAsync();
          }
          
          for (const style of localStyles) {
            if (style.name === item.localMatch) {
              localToken = style;
              break;
            }
          }

          // Replace style
          if (localToken) {
            try {
              if (item.type === 'text style' && 'textStyleId' in node) {
                await (node as any).setTextStyleIdAsync(localToken.id);
                replacedCount++;
              } else if (item.type === 'paint style') {
                // Check and replace fillStyleId
                if ('fillStyleId' in node && node.fillStyleId) {
                  await (node as any).setFillStyleIdAsync(localToken.id);
                  replacedCount++;
                }
                // Check and replace strokeStyleId (independent of fillStyleId)
                if ('strokeStyleId' in node && node.strokeStyleId) {
                  await (node as any).setStrokeStyleIdAsync(localToken.id);
                  replacedCount++;
                }
              } else if (item.type === 'effect style' && 'effectStyleId' in node) {
                await (node as any).setEffectStyleIdAsync(localToken.id);
                replacedCount++;
              } else if (item.type === 'grid style' && 'gridStyleId' in node) {
                await (node as any).setGridStyleIdAsync(localToken.id);
                replacedCount++;
              }
            } catch (error) {
              console.error(`Error replacing style:`, error);
            }
          }
        }
      }

      figma.ui.postMessage({
        type: 'replaceComplete',
        count: replacedCount
      });

      console.log(`Replaced ${replacedCount} external tokens with local matches`);
      
    } catch (error) {
      console.error('Error replacing matches:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  } else if (msg.type === 'reattachSelection') {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'findError',
          error: 'No elements selected. Please select at least one element.'
        });
        return;
      }

      let reattachedCount = 0;

      // Traverse all selected nodes and their children
      for (const node of selection) {
        reattachedCount += await traverseAndReattach(node);
      }

      figma.ui.postMessage({
        type: 'reattachComplete',
        count: reattachedCount
      });

      console.log(`Reattached ${reattachedCount} styles in selection`);
      
    } catch (error) {
      console.error('Error reattaching styles in selection:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  } else if (msg.type === 'reattachLayer') {
    try {
      const selection = figma.currentPage.selection;
      
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'findError',
          error: 'No elements selected. Please select at least one element.'
        });
        return;
      }

      let reattachedCount = 0;

      // Reattach styles only on selected layers (without traversing children)
      for (const node of selection) {
        reattachedCount += await reattachStylesOnNode(node);
      }

      figma.ui.postMessage({
        type: 'reattachComplete',
        count: reattachedCount
      });

      console.log(`Reattached ${reattachedCount} styles on selected layers`);
      
    } catch (error) {
      console.error('Error reattaching styles on layers:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  } else if (msg.type === 'reattach') {
    try {
      const nodeIds = msg.nodeIds;
      let reattachedCount = 0;

      // Traverse all matched nodes and their children (unified logic)
      for (const nodeId of nodeIds) {
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) continue;

        reattachedCount += await traverseAndReattach(node);
      }

      figma.ui.postMessage({
        type: 'reattachComplete',
        count: reattachedCount
      });

      console.log(`Reattached ${reattachedCount} styles`);
      
    } catch (error) {
      console.error('Error reattaching styles:', error);
      figma.ui.postMessage({
        type: 'findError',
        error: String(error)
      });
    }
  } else if (msg.type === 'scrollToNode') {
    try {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node) {
        // Find the page that contains this node
        let nodePage: PageNode | null = null;
        let currentNode: BaseNode | null = node;
        
        while (currentNode) {
          if (currentNode.type === 'PAGE') {
            nodePage = currentNode as PageNode;
            break;
          }
          currentNode = currentNode.parent;
        }
        
        // Switch to the node's page if it's different from current page
        if (nodePage && nodePage.id !== figma.currentPage.id) {
          figma.currentPage = nodePage;
        }
        
        // Scroll to the node and select it
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
    } catch (error) {
      console.error('Error scrolling to node:', error);
    }
  }
};
