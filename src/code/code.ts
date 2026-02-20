console.clear();
figma.showUI(__html__, { width: 700, height: 700 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'findAll') {
    console.log('hello');
    await figma.loadAllPagesAsync();
    const layers = figma.root.findAll(n => n.name === "Color");
    console.log(layers);
  }
};
