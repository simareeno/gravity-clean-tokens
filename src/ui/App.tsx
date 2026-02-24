import React, { useState, useEffect, useRef } from 'react';
import { Text, Button, Table, Tooltip, Icon, Loader } from '@gravity-ui/uikit';
import type { TableColumnConfig } from '@gravity-ui/uikit';
import { Target } from '@gravity-ui/icons';

// Import SVG icons
import StyleTextIcon from '../icons/StyleText.svg';
import StyleGridIcon from '../icons/StyleGrid.svg';
import StyleEffectIcon from '../icons/StyleEffect.svg';
import VariableBooleanIcon from '../icons/VariableBoolean.svg';
import VariableNumberIcon from '../icons/VariableNumber.svg';
import VariableStringIcon from '../icons/VariableString.svg';
import Placeholder from '../icons/Placeholder.png';
import ResizeIcon from '../icons/Resize.svg';

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
  attribute?: string;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const resizeCornerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const corner = resizeCornerRef.current;
    if (!corner) return;

    function resizeWindow(e: PointerEvent) {
      const size = {
        w: Math.max(50, Math.floor(e.clientX + 5)),
        h: Math.max(50, Math.floor(e.clientY + 5))
      };
      parent.postMessage({ pluginMessage: { type: 'resize', size: size } }, '*');
    }

    const handlePointerDown = (e: PointerEvent) => {
      corner.onpointermove = resizeWindow;
      corner.setPointerCapture(e.pointerId);
    };

    const handlePointerUp = (e: PointerEvent) => {
      corner.onpointermove = null;
      corner.releasePointerCapture(e.pointerId);
    };

    corner.addEventListener('pointerdown', handlePointerDown);
    corner.addEventListener('pointerup', handlePointerUp);

    return () => {
      corner.removeEventListener('pointerdown', handlePointerDown);
      corner.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      
      if (msg.type === 'findResults') {
        const data = msg as FindResults;
        setResults(data.results);
        setScopeInfo(`Found ${data.count} external library usages in ${data.scopeName}`);
        setReplacedItems(new Set());
        setIsLoading(false);
      } else if (msg.type === 'findError') {
        setScopeInfo(`Error: ${msg.error}`);
        setResults([]);
        setReplacedItems(new Set());
        setIsLoading(false);
      } else if (msg.type === 'replaceComplete') {
        setScopeInfo(`Replaced ${msg.count} external tokens with local matches`);
      } else if (msg.type === 'reattachComplete') {
        setScopeInfo(`Reattached ${msg.count} styles`);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleFindPage = () => {
    setIsLoading(true);
    setResults([]);
    setScopeInfo('');
    parent.postMessage({ pluginMessage: { type: 'findPage' } }, '*');
  };

  const handleFindSelection = () => {
    setIsLoading(true);
    setResults([]);
    setScopeInfo('');
    parent.postMessage({ pluginMessage: { type: 'findSelection' } }, '*');
  };

  const handleFindFile = () => {
    setIsLoading(true);
    setResults([]);
    setScopeInfo('');
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

  const handleReattach = () => {
    // Get unique node IDs from results
    const uniqueNodeIds = Array.from(new Set(results.map(item => item.nodeId).filter(Boolean)));
    
    if (uniqueNodeIds.length === 0) {
      return;
    }

    // Send reattach command to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'reattach',
        nodeIds: uniqueNodeIds
      }
    }, '*');
  };

  const handleReattachSelection = () => {
    setIsLoading(true);
    setResults([]);
    setScopeInfo('');
    // Send reattach selection command to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'reattachSelection'
      }
    }, '*');
  };

  const handleReattachLayer = () => {
    setIsLoading(true);
    setResults([]);
    setScopeInfo('');
    // Send reattach layer command to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'reattachLayer'
      }
    }, '*');
  };

  const handleScrollToNode = (nodeId: string | undefined) => {
    if (!nodeId) return;
    
    parent.postMessage({
      pluginMessage: {
        type: 'scrollToNode',
        nodeId: nodeId
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
      name: 'External match',
      className: "g-text_variant_body-1",
      width: '28%',
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            {getIconForType(item.type, item.value)}
            <span style={{
              color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
              textDecoration: isReplaced ? 'line-through' : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
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
      width: '28%',
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            {item.localMatch ? (
              <>
                {getIconForType(item.type, item.value)}
                <span
                 style={{
                  color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
                  textDecoration: isReplaced ? 'line-through' : undefined,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
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
      id: 'pageLayer',
      className: "g-text_variant_body-1",
      name: 'Page / Layer',
      width: '29%',
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        const hasParents = item.parents && item.parents.length > 0;
        
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isReplaced ? 'var(--g-color-text-secondary)' : undefined,
              textDecoration: isReplaced ? 'line-through' : undefined,
              overflow: 'hidden'
            }}
          >
            {item.nodeId && (
              <Tooltip content="Scroll to node in Figma" placement="top">
                <Button
                  view="flat-secondary"
                  size="xs"
                  onClick={() => handleScrollToNode(item.nodeId)}
                >
                  <Icon data={Target} size={16} />
                </Button>
              </Tooltip>
            )}
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {item.page} / {hasParents && '... / '}{item.layerName}
            </span>
          </div>
        );
      },
    },
    {
      id: 'attribute',
      name: 'Attribute',
      className: "g-text_variant_body-1",
      width: '15%',
      template: (item: ExternalUsage, index: number) => {
        const isReplaced = replacedItems.has(index);
        return (
          <div style={{ overflow: 'hidden' }}>
            <span style={{
              color: isReplaced ? 'var(--g-color-text-secondary)' : 'var(--g-color-text-secondary)',
              textDecoration: isReplaced ? 'line-through' : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {item.attribute || '—'}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', position: 'relative' }}>
      
      <div
        ref={resizeCornerRef}
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img src={ResizeIcon} style={{ width: '100%', height: '100%', pointerEvents: 'none' }} alt="" />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1px', flexWrap: 'wrap' }}>
          <Button view="normal" size="l" onClick={handleFindSelection} pin="round-brick">
            Find in Selection
          </Button>
          <Button view="normal" size="l" onClick={handleFindPage} pin="brick-brick">
            Current Page
          </Button>
          <Button view="normal" size="l" onClick={handleFindFile} pin="brick-round">
            Entire File
          </Button>
        </div>
        <div style={{ display: 'flex', gap: '1px', flexWrap: 'wrap' }}>
          <Button view="normal" size="l" onClick={handleReattachSelection} pin="round-brick">
            Reattach Selection
          </Button>
          <Button view="normal" size="l" onClick={handleReattachLayer} pin="brick-round">
            Layer
          </Button>
        </div>
      </div>
      

      {!isLoading && !scopeInfo && results.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 10%',
          gap: '32px',
          flex: '1'
        }}>
          <img width="140" src={Placeholder} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <Text variant="subheader-3" color="complementary">Clean up your file</Text>
            <Text variant="body-3" color="complementary">Find and replace external styles and variables. Use&nbsp;reattach for stubborn variables</Text>
          </div>
        </div>
      )}
      
      {scopeInfo && (
        <Text variant="body-2">
          {scopeInfo}
        </Text>
      )}
      
      {isLoading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          padding: '48px 16px',
          flex: 1
        }}>
          <Loader size="l" />
          <div style={{ textAlign: 'center' }}>
            <Text variant="body-2" color="secondary">
              Search in large files will take several minutes...
            </Text>
          </div>
        </div>
      )}
      
      {!isLoading && results.length > 0 && (
        <>
        <div style={{ display: 'flex', gap: '8px' }}>
            {hasMatchesToReplace && (
              <Button
                view="normal"
                size="l"
                onClick={handleReplaceMatches}
                disabled={replacedItems.size > 0}
              >
                Replace matches
              </Button>
            )}
            <Button
              view="normal"
              size="l"
              onClick={handleReattach}
            >
              Reattach matches
            </Button>
          </div>
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
