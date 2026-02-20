console.clear();
figma.showUI(__html__, { width: 700, height: 700 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'findPage') {
    console.log('hello');
  }
};
