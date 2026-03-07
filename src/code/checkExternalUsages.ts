export interface ExternalUsage {
  layerName: string;
  name: string;
  value: string;
  type: 'text style' | 'paint style' | 'grid style' | 'effect style' | 'color variable' | 'number variable' | 'string variable' | 'boolean variable';
  page: string;
  parents: string[];
  localMatch: string;
  nodeId: string;
  attribute?: string;
}

/**
 * Finds a matching local variable or style by name
 * @param name - The name to search for
 * @param type - The type of token (variable or style)
 * @returns The name of the matching local token, or empty string if not found
 */
async function findLocalMatch(name: string, type: ExternalUsage['type']): Promise<string> {
  try {
    // Check if it's a variable type
    if (type.includes('variable')) {
      // Get all local variable collections (non-remote)
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      
      for (const collection of collections) {
        // Get all variables in this collection
        for (const variableId of collection.variableIds) {
          const variable = await figma.variables.getVariableByIdAsync(variableId);
          if (variable && variable.name === name) {
            // Check if variable type matches
            const isColorVariable = type === 'color variable' && variable.resolvedType === 'COLOR';
            const isNumberVariable = type === 'number variable' && variable.resolvedType === 'FLOAT';
            const isStringVariable = type === 'string variable' && variable.resolvedType === 'STRING';
            const isBooleanVariable = type === 'boolean variable' && variable.resolvedType === 'BOOLEAN';
            
            if (isColorVariable || isNumberVariable || isStringVariable || isBooleanVariable) {
              return variable.name;
            }
          }
        }
      }
    }
    // Check if it's a style type
    else if (type.includes('style')) {
      // Get all local styles based on type
      let localStyles: BaseStyle[] = [];
      
      if (type === 'text style') {
        localStyles = await figma.getLocalTextStylesAsync();
      } else if (type === 'paint style') {
        localStyles = await figma.getLocalPaintStylesAsync();
      } else if (type === 'effect style') {
        localStyles = await figma.getLocalEffectStylesAsync();
      } else if (type === 'grid style') {
        localStyles = await figma.getLocalGridStylesAsync();
      }
      
      for (const style of localStyles) {
        if (style.name === name) {
          return style.name;
        }
      }
    }
  } catch (error) {
    console.error('Error finding local match:', error);
  }
  
  return '';
}

/**
 * Checks a single node for external library variables and styles
 * @param node - The node to check
 * @param page - The page name where the node is located
 * @param parents - Array of parent node names
 * @returns Array of external usages found in this node
 */
export async function checkNodeForExternalUsages(node: SceneNode, page: string, parents: string[]): Promise<ExternalUsage[]> {
  const results: ExternalUsage[] = [];
  
  // Track which properties have styles to avoid duplicate variable entries
  const propertiesWithStyles = new Set<string>();
  
  // Track if node has a text style (to skip typography variables)
  let hasTextStyle = false;
  
  // Track variable IDs that are used within external styles (should be skipped)
  const variablesInExternalStyles = new Set<string>();

  // Helper function to check variable bindings
  const checkVariableBindings = async (bindings: { [field: string]: VariableAlias } | undefined, propertyType?: string) => {
    if (!bindings) return;

    for (const field in bindings) {
      // Skip typography variables if text style exists
      const typographyFields = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'paragraphIndent', 'paragraphSpacing'];
      if (hasTextStyle && typographyFields.includes(field)) {
        continue;
      }
      
      // Skip if this property already has a style
      if (propertyType && propertiesWithStyles.has(propertyType)) {
        continue;
      }
      
      const variableAlias = bindings[field];
      
      // Handle both single variable alias and array of variable aliases
      const aliases = Array.isArray(variableAlias) ? variableAlias : [variableAlias];
      
      for (const alias of aliases) {
        if (alias && alias.id) {
          try {
            const variable = await figma.variables.getVariableByIdAsync(alias.id);
            if (variable) {
              // Skip if this variable is used within an external style
              if (variablesInExternalStyles.has(alias.id)) {
                continue;
              }
              
              const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
              
              // Check if variable is from external library
              if (collection && collection.remote) {
                const value = await getVariableValue(variable);
                
                // Determine specific variable type
                let variableType: 'color variable' | 'number variable' | 'string variable' | 'boolean variable';
                switch (variable.resolvedType) {
                  case 'COLOR':
                    variableType = 'color variable';
                    break;
                  case 'FLOAT':
                    variableType = 'number variable';
                    break;
                  case 'STRING':
                    variableType = 'string variable';
                    break;
                  case 'BOOLEAN':
                    variableType = 'boolean variable';
                    break;
                  default:
                    variableType = 'string variable'; // fallback
                }
                
                // Find matching local variable
                const localMatch = await findLocalMatch(variable.name, variableType);
                
                results.push({
                  layerName: node.name,
                  name: variable.name,
                  value: value,
                  type: variableType,
                  page: page,
                  parents: parents,
                  localMatch: localMatch,
                  nodeId: node.id,
                  attribute: field
                });
              }
            }
          } catch (error) {
            console.error(`Error checking variable for field ${field}:`, error);
          }
        }
      }
    }
  };

  // Helper function to get variable value as string
  const getVariableValue = async (variable: Variable): Promise<string> => {
    try {
      const modeId = Object.keys(variable.valuesByMode)[0];
      const value = variable.valuesByMode[modeId];
      
      if (typeof value === 'object' && value !== null) {
        if ('r' in value && 'g' in value && 'b' in value) {
          // RGB/RGBA color
          const alpha = 'a' in value ? value.a : 1;
          return `rgba(${Math.round(value.r * 255)}, ${Math.round(value.g * 255)}, ${Math.round(value.b * 255)}, ${alpha})`;
        }
        // Check if this is a VARIABLE_ALIAS
        if ('type' in value && value.type === 'VARIABLE_ALIAS' && 'id' in value) {
          // Recursively resolve the aliased variable
          try {
            const aliasedVariable = await figma.variables.getVariableByIdAsync(value.id as string);
            if (aliasedVariable) {
              return getVariableValue(aliasedVariable);
            }
          } catch (error) {
            console.error('Error resolving variable alias:', error);
          }
        }
        return JSON.stringify(value);
      }
      return String(value);
    } catch (error) {
      return 'unknown';
    }
  };

  // Helper function to check style
  const checkStyle = async (styleId: string, styleType: 'fill' | 'stroke' | 'effect' | 'grid' | 'text') => {
    if (!styleId) return;

    try {
      let style: BaseStyle | null = null;
      
      switch (styleType) {
        case 'fill':
        case 'stroke':
          style = await figma.getStyleByIdAsync(styleId) as PaintStyle | null;
          break;
        case 'effect':
          style = await figma.getStyleByIdAsync(styleId) as EffectStyle | null;
          break;
        case 'grid':
          style = await figma.getStyleByIdAsync(styleId) as GridStyle | null;
          break;
        case 'text':
          style = await figma.getStyleByIdAsync(styleId) as TextStyle | null;
          break;
      }

      if (style && style.remote) {
        // Mark this property as having a style
        propertiesWithStyles.add(styleType);
        
        // Mark if this is a text style
        if (styleType === 'text') {
          hasTextStyle = true;
        }
        
        // Collect all variable IDs used in this external style
        if (style.type === 'PAINT') {
          const paintStyle = style as PaintStyle;
          if (paintStyle.paints) {
            paintStyle.paints.forEach((paint) => {
              if ('boundVariables' in paint && paint.boundVariables) {
                Object.values(paint.boundVariables).forEach((varAlias) => {
                  const aliases = Array.isArray(varAlias) ? varAlias : [varAlias];
                  aliases.forEach((alias) => {
                    if (alias && alias.id) {
                      variablesInExternalStyles.add(alias.id);
                    }
                  });
                });
              }
            });
          }
        } else if (style.type === 'EFFECT') {
          const effectStyle = style as EffectStyle;
          if (effectStyle.effects) {
            effectStyle.effects.forEach((effect) => {
              if ('boundVariables' in effect && effect.boundVariables) {
                Object.values(effect.boundVariables).forEach((varAlias) => {
                  const aliases = Array.isArray(varAlias) ? varAlias : [varAlias];
                  aliases.forEach((alias) => {
                    if (alias && alias.id) {
                      variablesInExternalStyles.add(alias.id);
                    }
                  });
                });
              }
            });
          }
        } else if (style.type === 'GRID') {
          const gridStyle = style as GridStyle;
          if (gridStyle.layoutGrids) {
            gridStyle.layoutGrids.forEach((grid) => {
              if ('boundVariables' in grid && grid.boundVariables) {
                Object.values(grid.boundVariables).forEach((varAlias) => {
                  const aliases = Array.isArray(varAlias) ? varAlias : [varAlias];
                  aliases.forEach((alias) => {
                    if (alias && alias.id) {
                      variablesInExternalStyles.add(alias.id);
                    }
                  });
                });
              }
            });
          }
        } else if (style.type === 'TEXT') {
          const textStyle = style as TextStyle;
          if ('boundVariables' in textStyle && textStyle.boundVariables) {
            Object.values(textStyle.boundVariables).forEach((varAlias) => {
              const aliases = Array.isArray(varAlias) ? varAlias : [varAlias];
              aliases.forEach((alias) => {
                if (alias && alias.id) {
                  variablesInExternalStyles.add(alias.id);
                }
              });
            });
          }
        }
        
        const value = getStyleValue(style, styleType);
        
        // Determine specific style type
        let specificStyleType: 'text style' | 'paint style' | 'grid style' | 'effect style';
        let attributeName: string;
        switch (styleType) {
          case 'text':
            specificStyleType = 'text style';
            attributeName = 'textStyleId';
            break;
          case 'fill':
            specificStyleType = 'paint style';
            attributeName = 'fillStyleId';
            break;
          case 'stroke':
            specificStyleType = 'paint style';
            attributeName = 'strokeStyleId';
            break;
          case 'grid':
            specificStyleType = 'grid style';
            attributeName = 'gridStyleId';
            break;
          case 'effect':
            specificStyleType = 'effect style';
            attributeName = 'effectStyleId';
            break;
        }
        
        // Find matching local style
        const localMatch = await findLocalMatch(style.name, specificStyleType);
        
        results.push({
          layerName: node.name,
          name: style.name,
          value: value,
          type: specificStyleType,
          page: page,
          parents: parents,
          localMatch: localMatch,
          nodeId: node.id,
          attribute: attributeName
        });
      }
    } catch (error) {
      console.error(`Error checking style ${styleId}:`, error);
    }
  };

  // Helper function to get style value as string
  const getStyleValue = (style: BaseStyle, styleType: string): string => {
    try {
      if (style.type === 'PAINT') {
        const paintStyle = style as PaintStyle;
        if (paintStyle.paints && paintStyle.paints.length > 0) {
          const paint = paintStyle.paints[0];
          if (paint.type === 'SOLID' && 'color' in paint) {
            const c = paint.color;
            return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${paint.opacity || 1})`;
          }
          return paint.type;
        }
      } else if (style.type === 'TEXT') {
        const textStyle = style as TextStyle;
        return `${textStyle.fontName.family} ${textStyle.fontSize}px`;
      } else if (style.type === 'EFFECT') {
        const effectStyle = style as EffectStyle;
        return effectStyle.effects.map(e => e.type).join(', ');
      } else if (style.type === 'GRID') {
        const gridStyle = style as GridStyle;
        return gridStyle.layoutGrids.map(g => g.pattern).join(', ');
      }
      return style.type;
    } catch (error) {
      return 'unknown';
    }
  };

  // FIRST: Check all styles to mark which properties have styles
  // Check fill styles
  if ('fillStyleId' in node && node.fillStyleId) {
    if (typeof node.fillStyleId === 'string') {
      await checkStyle(node.fillStyleId, 'fill');
    }
  }

  // Check stroke styles
  if ('strokeStyleId' in node && node.strokeStyleId) {
    if (typeof node.strokeStyleId === 'string') {
      await checkStyle(node.strokeStyleId, 'stroke');
    }
  }

  // Check effect styles
  if ('effectStyleId' in node && node.effectStyleId) {
    if (typeof node.effectStyleId === 'string') {
      await checkStyle(node.effectStyleId, 'effect');
    }
  }

  // Check grid styles
  if ('gridStyleId' in node && node.gridStyleId) {
    if (typeof node.gridStyleId === 'string') {
      await checkStyle(node.gridStyleId, 'grid');
    }
  }

  // Check text styles and mark if any text style exists (not just remote)
  if ('textStyleId' in node && node.textStyleId) {
    if (typeof node.textStyleId === 'string') {
      // Mark that text style exists regardless of whether it's remote
      hasTextStyle = true;
      await checkStyle(node.textStyleId, 'text');
    }
  }

  // SECOND: Check variables only for properties that don't have styles
  // Check variable bindings if node supports them
  if ('boundVariables' in node && node.boundVariables) {
    await checkVariableBindings(node.boundVariables as { [field: string]: VariableAlias });
  }

  // Check explicit variable bindings for different node types
  if ('explicitVariableModes' in node && node.explicitVariableModes) {
    // Component sets can have explicit variable modes
  }

  // Check fills for variable bindings (only if no fill style)
  if ('fills' in node && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if ('boundVariables' in fill && fill.boundVariables) {
        await checkVariableBindings(fill.boundVariables as { [field: string]: VariableAlias }, 'fill');
      }
    }
  }

  // Check strokes for variable bindings (only if no stroke style)
  if ('strokes' in node && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes) {
      if ('boundVariables' in stroke && stroke.boundVariables) {
        await checkVariableBindings(stroke.boundVariables as { [field: string]: VariableAlias }, 'stroke');
      }
    }
  }

  // Check effects for variable bindings (only if no effect style)
  if ('effects' in node && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if ('boundVariables' in effect && effect.boundVariables) {
        await checkVariableBindings(effect.boundVariables as { [field: string]: VariableAlias }, 'effect');
      }
    }
  }

  // Check layout grids for variable bindings (only if no grid style)
  if ('layoutGrids' in node && Array.isArray(node.layoutGrids)) {
    for (const grid of node.layoutGrids) {
      if ('boundVariables' in grid && grid.boundVariables) {
        await checkVariableBindings(grid.boundVariables as { [field: string]: VariableAlias }, 'grid');
      }
    }
  }

  return results;
}

/**
 * Recursively traverses all nodes on a page
 * @param node - The node to start traversal from
 * @param results - Array to accumulate results
 * @param page - The page name (optional, will be determined from node hierarchy)
 * @param parents - Array of parent node names (optional, will be built during traversal)
 */
export async function traverseNode(node: BaseNode, results: ExternalUsage[], page?: string, parents: string[] = []): Promise<void> {
  // Determine page name
  let currentPage = page;
  if (node.type === 'PAGE') {
    currentPage = node.name;
  } else if (!currentPage) {
    // If page is not set, try to find it from the node's parent hierarchy
    let parentNode = node.parent;
    while (parentNode) {
      if (parentNode.type === 'PAGE') {
        currentPage = parentNode.name;
        break;
      }
      parentNode = parentNode.parent;
    }
  }
  
  // Check if node is a SceneNode (has visual properties)
  if ('type' in node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
    const nodeResults = await checkNodeForExternalUsages(node as SceneNode, currentPage || 'Unknown', parents);
    results.push(...nodeResults);
  }

  // Recursively check children
  if ('children' in node) {
    // Build new parents array for children
    const newParents = node.type !== 'DOCUMENT' && node.type !== 'PAGE'
      ? [...parents, node.name]
      : parents;
    
    for (const child of node.children) {
      await traverseNode(child, results, currentPage, newParents);
    }
  }
}
