import React, { useState, useEffect } from 'react';
import { Text, Button, Table } from '@gravity-ui/uikit';
import type { TableColumnConfig } from '@gravity-ui/uikit';

// Import SVG icons
import StyleTextIcon from '../icons/StyleText.svg';
import StyleGridIcon from '../icons/StyleGrid.svg';
import StyleEffectIcon from '../icons/StyleEffect.svg';
import VariableBooleanIcon from '../icons/VariableBoolean.svg';
import VariableNumberIcon from '../icons/VariableNumber.svg';
import VariableStringIcon from '../icons/VariableString.svg';

interface ExternalUsage {
  layerName: string;
  name: string;
  value: string;
  type: 'text style' | 'paint style' | 'grid style' | 'effect style' | 'color variable' | 'number variable' | 'string variable' | 'boolean variable';
  page: string;
  parents: string[];
  localMatch: string;
  nodeId?: string;
  replaced?: boolean;
}

interface FindResults {
  type: 'findResults';
  scope: string;
  scopeName: string;
  scopeId: string | null;
  results: ExternalUsage[];
  count: number;
}

const App: React.FC = () => {
  const [results, setResults] = useState<ExternalUsage[]>([]);
  const [scopeInfo, setScopeInfo] = useState<string>('');
  const [replacedItems, setReplacedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === 'findResults') {
        const data = msg as FindResults;
        setResults(data.results);
        setScopeInfo(`Found ${data.count} external library usages in ${data.scopeName}`);
        setReplacedItems(new Set());
      } else if (msg.type === 'findError') {
        setScopeInfo(`Error: ${msg.error}`);
        setResults([]);
        setReplacedItems(new Set());
      } else if (msg.type === 'replaceComplete') {
        setScopeInfo(`Replaced ${msg.count} external tokens with local matches`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleFindPage = () => {
    parent.postMessage({ pluginMessage: { type: 'findPage' } }, '*');
  };

  const handleFindSelection = () => {
    parent.postMessage({ pluginMessage: { type: 'findSelection' } }, '*');
  };

  const handleFindFile = () => {
    parent.postMessage({ pluginMessage: { type: 'findFile' } }, '*');
  };

  const handleReplaceMatches = () => {
    // Find all items with local matches
    const itemsToReplace = results
      .map((item, index) => ({ ...item, index }))
      .filter(item => item.localMatch);
    
    if (itemsToReplace.length === 0) {
      return;
    }

    // Mark items as replaced in UI
    const newReplacedItems = new Set(itemsToReplace.map(item => item.index));
    setReplacedItems(newReplacedItems);

    // Send replace command to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'replaceMatches',
        items: itemsToReplace.map(item => ({
          nodeId: item.nodeId,
          name: item.name,
          localMatch: item.localMatch,
          type: item.type
        }))
      }
    }, '*');
  };

  const hasMatchesToReplace = results.some(item => item.localMatch);

  const getIconForType = (type: ExternalUsage['type'], value: string) => {
    const containerStyle = {
      width: '24px',
      height: '24px',
      marginRight: '2px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };

    const colorShapeStyle = {
      width: '16px',
      height: '16px',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    };

    switch (type) {
      case 'text style':
        return (
          <div style={containerStyle}>
            <img src={StyleTextIcon} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
        );
      case 'grid style':
        return (
          <div style={containerStyle}>
            <img src={StyleGridIcon} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
        );
      case 'effect style':
        return (
          <div style={containerStyle}>
            <img src={StyleEffectIcon} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
        );
      case 'boolean variable':
        return (
          <div style={containerStyle}>
            <img src={VariableBooleanIcon} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
        );
      case 'number variable':
        return (
          <div style={containerStyle}>
            <img src={VariableNumberIcon} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
        );
      case 'string variable':
        return (
          <div style={containerStyle}>
            <img src={VariableStringIcon} style={{ width: '100%', height: '100%' }} alt="" />
          </div>
        );
      case 'color variable':
        return (
          <div style={containerStyle}>
            <div
              style={{
                ...colorShapeStyle,
                backgroundColor: value,
                borderRadius: '20%'
              }}
            />
          </div>
        );
      case 'paint style':
        return (
          <div style={containerStyle}>
            <div
              style={{
                ...colorShapeStyle,
                backgroundColor: value,
                borderRadius: '50%'
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const columns: TableColumnConfig<ExternalUsage>[] = [
    {
      id: 'name',
      name: 'Token',
      className: "g-text_variant_body-1",
      width: 300,
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {getIconForType(item.type, item.value)}
            <span style={{
              color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
              textDecoration: isReplaced ? 'line-through' : undefined
            }}>
              {item.name}
            </span>
          </div>
        );
      },
    },
    {
      id: 'localMatch',
      name: 'Local Match',
      className: "g-text_variant_body-1",
      width: 300,
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {item.localMatch ? (
              <>
                {getIconForType(item.type, item.value)}
                <span style={{
                  color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
                  textDecoration: isReplaced ? 'line-through' : undefined
                }}>
                  {item.localMatch}
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--g-color-text-secondary)', fontStyle: 'italic' }}>—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'layerName',
      className: "g-text_variant_body-1",
      name: 'Layer',
      width: 200,
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <span style={{
            color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
            textDecoration: isReplaced ? 'line-through' : undefined
          }}>
            {item.layerName}
          </span>
        );
      },
    },
    {
      id: 'page',
      className: "g-text_variant_body-1",
      name: 'Page',
      width: 150,
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <span style={{
            color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
            textDecoration: isReplaced ? 'line-through' : undefined
          }}>
            {item.page}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button view="action" size="l" onClick={handleFindPage}>
          Find in Current Page
        </Button>
        <Button view="action" size="l" onClick={handleFindSelection}>
          Find in Selection
        </Button>
        <Button view="action" size="l" onClick={handleFindFile}>
          Find in Entire File
        </Button>
      </div>
      
      {scopeInfo && (
        <Text variant="body-2" color="secondary">
          {scopeInfo}
        </Text>
      )}
      
      {results.length > 0 && (
        <>
          {hasMatchesToReplace && (
            <Button
              view="outlined"
              size="l"
              onClick={handleReplaceMatches}
              disabled={replacedItems.size > 0}
            >
              Replace matches
            </Button>
          )}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Table
              data={results}
              columns={columns}
              verticalAlign="top"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default App;
