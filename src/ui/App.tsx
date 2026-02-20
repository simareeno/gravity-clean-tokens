import React, { useState } from 'react';
import { Text, Button } from '@gravity-ui/uikit';

const App: React.FC = () => {
  const handleClick = () => {
    parent.postMessage({ pluginMessage: { type: 'findAll' } }, '*');
  };

  return (
    <div>
        <Text variant="header-1">
          Figma Clean Tokens
        </Text>
        <Button view="action" size="l" onClick={handleClick}>
          Export
        </Button>
    </div>
  );
};

export default App;
