import React, { useState, useEffect } from 'react';
import { Text, Button, Table } from '@gravity-ui/uikit';
import type { TableColumnConfig } from '@gravity-ui/uikit';

interface ExternalUsage {
  layerName: string;
  name: string;
  value: string;
  type: 'variable' | 'style';
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

  const columns: TableColumnConfig<ExternalUsage>[] = [
    {
      id: 'layerName',
      name: 'Layer',
      width: 200,
    },
    {
      id: 'name',
      name: 'Token',
      width: 250,
    },
    {
      id: 'type',
      name: 'Type',
      width: 100,
    },
    {
      id: 'page',
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
