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
  } else if (msg.type === 'replaceMatches') {
    try {
      const items = msg.items;
      let replacedCount = 0;

      for (const item of items) {
        const node = figma.getNodeById(item.nodeId);
        if (!node) continue;


        // Find the local match based on type
        let localToken: Variable | BaseStyle | null = null;

        if (item.type.includes('variable')) {
          // Find local variable
          const collections = figma.variables.getLocalVariableCollections();
          for (const collection of collections) {
            for (const variableId of collection.variableIds) {
              const variable = figma.variables.getVariableById(variableId);
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
                  const externalVar = figma.variables.getVariableById(alias.id);
                  if (externalVar && externalVar.name === item.name) {
                    const collection = figma.variables.getVariableCollectionById(externalVar.variableCollectionId);
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
              node.fills.forEach((fill, fillIndex) => {
                if ('boundVariables' in fill && fill.boundVariables) {
                  for (const field in fill.boundVariables) {
                    const binding = (fill.boundVariables as any)[field];
                    const bindings = Array.isArray(binding) ? binding : [binding];
                    
                    for (const alias of bindings) {
                      if (alias && alias.id) {
                        const externalVar = figma.variables.getVariableById(alias.id);
                        if (externalVar && externalVar.name === item.name) {
                          const collection = figma.variables.getVariableCollectionById(externalVar.variableCollectionId);
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
              });
            }

            // Check strokes
            if ('strokes' in node && Array.isArray(node.strokes)) {
              node.strokes.forEach((stroke, strokeIndex) => {
                if ('boundVariables' in stroke && stroke.boundVariables) {
                  for (const field in stroke.boundVariables) {
                    const binding = (stroke.boundVariables as any)[field];
                    const bindings = Array.isArray(binding) ? binding : [binding];
                    
                    for (const alias of bindings) {
                      if (alias && alias.id) {
                        const externalVar = figma.variables.getVariableById(alias.id);
                        if (externalVar && externalVar.name === item.name) {
                          const collection = figma.variables.getVariableCollectionById(externalVar.variableCollectionId);
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
              });
            }

            // Check effects - need to clone and modify the effects array
            if ('effects' in node && Array.isArray(node.effects)) {
              // Clone the effects array
              const newEffects = JSON.parse(JSON.stringify(node.effects));
              let effectsModified = false;
              
              newEffects.forEach((effect: any, effectIndex: number) => {
                const originalEffect = node.effects[effectIndex];
                
                if ('boundVariables' in originalEffect && originalEffect.boundVariables) {
                  for (const field in originalEffect.boundVariables) {
                    const binding = (originalEffect.boundVariables as any)[field];
                    const bindings = Array.isArray(binding) ? binding : [binding];
                    
                    for (const alias of bindings) {
                      if (alias && alias.id) {
                        const externalVar = figma.variables.getVariableById(alias.id);
                        if (externalVar && externalVar.name === item.name) {
                          const collection = figma.variables.getVariableCollectionById(externalVar.variableCollectionId);
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
              });
              
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
            localStyles = figma.getLocalTextStyles();
          } else if (item.type === 'paint style') {
            localStyles = figma.getLocalPaintStyles();
          } else if (item.type === 'effect style') {
            localStyles = figma.getLocalEffectStyles();
          } else if (item.type === 'grid style') {
            localStyles = figma.getLocalGridStyles();
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
                (node as any).textStyleId = localToken.id;
                replacedCount++;
              } else if (item.type === 'paint style') {
                if ('fillStyleId' in node && node.fillStyleId) {
                  (node as any).fillStyleId = localToken.id;
                  replacedCount++;
                } else if ('strokeStyleId' in node && node.strokeStyleId) {
                  (node as any).strokeStyleId = localToken.id;
                  replacedCount++;
                }
              } else if (item.type === 'effect style' && 'effectStyleId' in node) {
                (node as any).effectStyleId = localToken.id;
                replacedCount++;
              } else if (item.type === 'grid style' && 'gridStyleId' in node) {
                (node as any).gridStyleId = localToken.id;
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
  } else if (msg.type === 'scrollToNode') {
    try {
      const node = figma.getNodeById(msg.nodeId);
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
