export interface ExternalUsage {
  layerName: string;
  name: string;
  value: string;
  type: 'variable' | 'style';
  page: string;
  parents: string[];
}

/**
 * Checks a single node for external library variables and styles
 * @param node - The node to check
 * @param page - The page name where the node is located
 * @param parents - Array of parent node names
 * @returns Array of external usages found in this node
 */
export function checkNodeForExternalUsages(node: SceneNode, page: string, parents: string[]): ExternalUsage[] {
  const results: ExternalUsage[] = [];
  
  // Track which properties have styles to avoid duplicate variable entries
  const propertiesWithStyles = new Set<string>();
  
  // Track if node has a text style (to skip typography variables)
  let hasTextStyle = false;

  // Helper function to check variable bindings
  const checkVariableBindings = (bindings: { [field: string]: VariableAlias } | undefined, propertyType?: string) => {
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
            const variable = figma.variables.getVariableById(alias.id);
            if (variable) {
              const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
              
              // Check if variable is from external library
              if (collection && collection.remote) {
                const value = getVariableValue(variable);
                results.push({
                  layerName: node.name,
                  name: variable.name,
                  value: value,
                  type: 'variable',
                  page: page,
                  parents: parents
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
  const getVariableValue = (variable: Variable): string => {
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
            const aliasedVariable = figma.variables.getVariableById(value.id as string);
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
  const checkStyle = (styleId: string, styleType: 'fill' | 'stroke' | 'effect' | 'grid' | 'text') => {
    if (!styleId) return;

    try {
      let style: BaseStyle | null = null;
      
      switch (styleType) {
        case 'fill':
        case 'stroke':
          style = figma.getStyleById(styleId) as PaintStyle | null;
          break;
        case 'effect':
          style = figma.getStyleById(styleId) as EffectStyle | null;
          break;
        case 'grid':
          style = figma.getStyleById(styleId) as GridStyle | null;
          break;
        case 'text':
          style = figma.getStyleById(styleId) as TextStyle | null;
          break;
      }

      if (style && style.remote) {
        // Mark this property as having a style
        propertiesWithStyles.add(styleType);
        
        // Mark if this is a text style
        if (styleType === 'text') {
          hasTextStyle = true;
        }
        
        const value = getStyleValue(style, styleType);
        results.push({
          layerName: node.name,
          name: style.name,
          value: value,
          type: 'style',
          page: page,
          parents: parents
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
      checkStyle(node.fillStyleId, 'fill');
    }
  }

  // Check stroke styles
  if ('strokeStyleId' in node && node.strokeStyleId) {
    if (typeof node.strokeStyleId === 'string') {
      checkStyle(node.strokeStyleId, 'stroke');
    }
  }

  // Check effect styles
  if ('effectStyleId' in node && node.effectStyleId) {
    if (typeof node.effectStyleId === 'string') {
      checkStyle(node.effectStyleId, 'effect');
    }
  }

  // Check grid styles
  if ('gridStyleId' in node && node.gridStyleId) {
    if (typeof node.gridStyleId === 'string') {
      checkStyle(node.gridStyleId, 'grid');
    }
  }

  // Check text styles and mark if any text style exists (not just remote)
  if ('textStyleId' in node && node.textStyleId) {
    if (typeof node.textStyleId === 'string') {
      // Mark that text style exists regardless of whether it's remote
      hasTextStyle = true;
      checkStyle(node.textStyleId, 'text');
    }
  }

  // SECOND: Check variables only for properties that don't have styles
  // Check variable bindings if node supports them
  if ('boundVariables' in node && node.boundVariables) {
    checkVariableBindings(node.boundVariables as { [field: string]: VariableAlias });
  }

  // Check explicit variable bindings for different node types
  if ('explicitVariableModes' in node && node.explicitVariableModes) {
    // Component sets can have explicit variable modes
  }

  // Check fills for variable bindings (only if no fill style)
  if ('fills' in node && Array.isArray(node.fills)) {
    node.fills.forEach((fill) => {
      if ('boundVariables' in fill && fill.boundVariables) {
        checkVariableBindings(fill.boundVariables as { [field: string]: VariableAlias }, 'fill');
      }
    });
  }

  // Check strokes for variable bindings (only if no stroke style)
  if ('strokes' in node && Array.isArray(node.strokes)) {
    node.strokes.forEach((stroke) => {
      if ('boundVariables' in stroke && stroke.boundVariables) {
        checkVariableBindings(stroke.boundVariables as { [field: string]: VariableAlias }, 'stroke');
      }
    });
  }

  // Check effects for variable bindings (only if no effect style)
  if ('effects' in node && Array.isArray(node.effects)) {
    node.effects.forEach((effect) => {
      if ('boundVariables' in effect && effect.boundVariables) {
        checkVariableBindings(effect.boundVariables as { [field: string]: VariableAlias }, 'effect');
      }
    });
  }

  // Check layout grids for variable bindings (only if no grid style)
  if ('layoutGrids' in node && Array.isArray(node.layoutGrids)) {
    node.layoutGrids.forEach((grid) => {
      if ('boundVariables' in grid && grid.boundVariables) {
        checkVariableBindings(grid.boundVariables as { [field: string]: VariableAlias }, 'grid');
      }
    });
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
export function traverseNode(node: BaseNode, results: ExternalUsage[], page?: string, parents: string[] = []) {
  // Determine page name
  let currentPage = page;
  if (node.type === 'PAGE') {
    currentPage = node.name;
  }
  
  // Check if node is a SceneNode (has visual properties)
  if ('type' in node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
    const nodeResults = checkNodeForExternalUsages(node as SceneNode, currentPage || 'Unknown', parents);
    results.push(...nodeResults);
  }

  // Recursively check children
  if ('children' in node) {
    // Build new parents array for children
    const newParents = node.type !== 'DOCUMENT' && node.type !== 'PAGE'
      ? [...parents, node.name]
      : parents;
    
    for (const child of node.children) {
      traverseNode(child, results, currentPage, newParents);
    }
  }
}
