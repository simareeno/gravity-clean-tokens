import React, { useState } from 'react';
import { Text, Button } from '@gravity-ui/uikit';

const App: React.FC = () => {
  const handleFindPage = () => {
    parent.postMessage({ pluginMessage: { type: 'findPage' } }, '*');
  };

  return (
    <div>
        <Text variant="header-1">
          Figma Clean Tokens
        </Text>
        <Button view="action" size="l" onClick={handleFindPage}>
          Find in Page
        </Button>
    </div>
  );
};

export default App;
