/* Keep the immersive portfolio usable when a browser disables WebGL. */
window.__VELORACreateGallery = (create, container, initialData) => {
  try { return create(); } catch (error) {
    if (!/WebGL|context/i.test(String(error))) throw error;
  }
  const surface = document.createElement('div');
  surface.className = 'replica-immersive';
  surface.tabIndex = 0;
  surface.setAttribute('aria-label', 'Immersive portfolio. Drag or use arrow keys to explore.');
  const plane = document.createElement('div');
  plane.className = 'replica-immersive-plane';
  surface.append(plane); container.append(surface);
  let x = 0, y = 0, start, moved = false, periodX = 1, periodY = 1;
  const slug = value => (Array.isArray(value) ? value.join('&') : value).toLowerCase().replace(/\s+/g,'-');
  const wrap = (value, period) => ((value % period) + period) % period - period;
  function position() {
    x = wrap(x, periodX); y = wrap(y, periodY);
    plane.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  function populate(data) {
    plane.replaceChildren();
    const columns = 6, rows = Math.max(1, Math.ceil(data.length / columns));
    const tile = Math.max(210, Math.min(320, innerWidth * .22));
    periodX = columns * tile; periodY = rows * tile;
    plane.style.width = `${periodX * 2}px`;
    plane.style.gridTemplateColumns = `repeat(${columns * 2},${tile}px)`;
    for(let row = 0; row < rows * 2; row++) for(let col = 0; col < columns * 2; col++) {
      const project = data[((row % rows) * columns + (col % columns)) % data.length];
      if (!project) continue;
      const card = document.createElement('a'), image = document.createElement('img');
      card.href = `${window.VELORA_BASE_PATH||'/'}collection/${slug(project.category)}/${slug(project.subCategory)}/${project.slug}`;
      card.setAttribute('aria-label', `${project.title}, ${project.location}`);
      card.style.width = card.style.height = `${tile}px`;
      image.src = project.image?.[0]?.small || project.image?.[0]?.medium || '';
      image.alt = project.title; image.loading = 'lazy'; image.draggable = false;
      card.append(image); plane.append(card);
      card.addEventListener('pointerenter', () => {
        const title = container.parentElement.querySelector('.project-title');
        if (title) title.textContent = project.title;
      });
    }
    x = innerWidth / 2 - periodX / 2; y = innerHeight / 2 - periodY / 2;
    position();
  }
  surface.addEventListener('pointerdown', e => {
    start = {x:e.clientX,y:e.clientY,offsetX:x,offsetY:y}; moved = false;
  });
  surface.addEventListener('pointermove', e => {
    if (!start) return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if (!moved && Math.hypot(dx,dy)>8) {moved=true;surface.setPointerCapture(e.pointerId);}
    x=start.offsetX+dx;y=start.offsetY+dy;position();
  });
  surface.addEventListener('pointerup', () => {start=null;});
  surface.addEventListener('pointercancel', () => {start=null;});
  surface.addEventListener('click', e => {if(moved){e.preventDefault();moved=false;}},true);
  surface.addEventListener('wheel', e => {e.preventDefault();x-=e.deltaX;y-=e.deltaY;position();},{passive:false});
  surface.addEventListener('keydown', e => {
    const delta={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]}[e.key];
    if(delta){e.preventDefault();x+=delta[0];y+=delta[1];position();}
  });
  populate(initialData);
  return {updateData:populate,dispose:()=>surface.remove()};
};
