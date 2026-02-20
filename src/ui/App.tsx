import React, { useState } from 'react';
import { Text, Button } from '@gravity-ui/uikit';

const App: React.FC = () => {
  const handleFindPage = () => {
    parent.postMessage({ pluginMessage: { type: 'findPage' } }, '*');
  };

  const handleFindSelection = () => {
    parent.postMessage({ pluginMessage: { type: 'findSelection' } }, '*');
  };

  const handleFindFile = () => {
    parent.postMessage({ pluginMessage: { type: 'findFile' } }, '*');
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Text variant="header-1">
          Figma Clean Tokens
        </Text>
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
  );
};

export default App;
