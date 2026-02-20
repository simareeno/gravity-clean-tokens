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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === 'findResults') {
        const data = msg as FindResults;
        setResults(data.results);
        setScopeInfo(`Found ${data.count} external library usages in ${data.scopeName}`);
      } else if (msg.type === 'findError') {
        setScopeInfo(`Error: ${msg.error}`);
        setResults([]);
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
      width: 350,
      template: (item: ExternalUsage) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {getIconForType(item.type, item.value)}
          <span>{item.name}</span>
        </div>
      ),
    },
    {
      id: 'layerName',
      className: "g-text_variant_body-1",
      name: 'Layer',
      width: 200,
    },
    {
      id: 'page',
      className: "g-text_variant_body-1",
      name: 'Page',
      width: 150,
    },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <Text variant="header-1">
        Figma Clean Tokens
      </Text>
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
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            data={results}
            columns={columns}
            verticalAlign="top"
          />
        </div>
      )}
    </div>
  );
};

export default App;
