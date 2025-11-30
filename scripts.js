/* scripts.js
   Load products from products.json, render product grid, product modal with options,
   maintain cart in localStorage, update cart counts in header and floating button.
*/

const PRODUCTS_JSON = 'products.json';
const CART_KEY = 'ylk_cart_v1';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let PRODUCTS = [];
let CART = loadCart();

function initApp(){
  document.getElementById('year').textContent = new Date().getFullYear();
  bindUI();
  loadProducts();
  updateCartUI();
}

function bindUI(){
  document.getElementById('floatingCart').addEventListener('click', openCart);
  document.getElementById('openCartBtn').addEventListener('click', openCart);
  document.getElementById('closeCart').addEventListener('click', closeCart);
  document.getElementById('clearCartBtn').addEventListener('click', () => {
    if(confirm('Clear cart?')){
      CART = []; saveCart(); updateCartUI(); renderCart();
    }
  });
  document.getElementById('payBtn').addEventListener('click', () => {
    alert('Demo checkout — no real payment processed.'); // demo only
    // Optionally clear after paying:
    // CART = []; saveCart(); updateCartUI(); renderCart();
  });
  document.getElementById('cartHeader').addEventListener('click', openCart);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('addToCartBtn').addEventListener('click', handleAddToCartFromModal);
  // Click outside modal to close
  document.getElementById('productModal').addEventListener('click', (e)=>{
    if(e.target === document.getElementById('productModal')) closeModal();
  });
}

async function loadProducts(){
  try{
    const res = await fetch(PRODUCTS_JSON, {cache: "no-store"});
    if(!res.ok) throw new Error('Failed to fetch products.json');
    PRODUCTS = await res.json();
    renderProducts();
  }catch(err){
    console.error('Could not load products:', err);
    document.getElementById('emptyHint').textContent = 'Could not load products. Check products.json or run from a local server.';
    document.getElementById('emptyHint').style.display = 'block';
  }
}

function renderProducts(){
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = '';
  if(!Array.isArray(PRODUCTS) || PRODUCTS.length === 0){
    document.getElementById('emptyHint').style.display = 'block';
    return;
  }
  document.getElementById('emptyHint').style.display = 'none';

  PRODUCTS.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('data-id', p.id);

    const img = document.createElement('img');
    img.src = p.image || 'logo.png';
    img.alt = p.title;

    const info = document.createElement('div');
    info.className = 'product-info';

    const title = document.createElement('h5');
    title.textContent = p.title;

    const desc = document.createElement('p');
    desc.textContent = p.description;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'small-btn';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', ()=> openProductModal(p.id));

    // quick add: choose first option, qty 1
    const quickBtn = document.createElement('button');
    quickBtn.className = 'small-btn';
    quickBtn.textContent = 'Quick Add';
    quickBtn.addEventListener('click', ()=> {
      const firstOption = (p.options && p.options[0]) ? p.options[0] : {name:'Default', price:0};
      addToCart({
        productId: p.id,
        title: p.title,
        image: p.image,
        option: firstOption.name,
        unitPrice: Number(firstOption.price || 0),
        qty:1
      });
      animateAdded(viewBtn);
    });

    actions.appendChild(viewBtn);
    actions.appendChild(quickBtn);

    info.appendChild(title);
    info.appendChild(desc);
    info.appendChild(actions);

    card.appendChild(img);
    card.appendChild(info);

    grid.appendChild(card);
  });
}

// modal handling
let currentModalProduct = null;
function openProductModal(productId){
  const p = PRODUCTS.find(x => x.id === productId);
  if(!p) return;
  currentModalProduct = p;
  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalDescription').textContent = p.description;
  document.getElementById('modalImage').src = p.image || 'logo.png';
  document.getElementById('modalQty').value = 1;

  const optionsWrap = document.getElementById('modalOptions');
  optionsWrap.innerHTML = '';
  (p.options || []).forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.textContent = `${opt.name} — $${Number(opt.price).toFixed(2)}`;
    btn.dataset.price = Number(opt.price);
    btn.dataset.name = opt.name;
    btn.className = idx===0 ? 'active' : '';
    btn.addEventListener('click', () => {
      document.querySelectorAll('#modalOptions button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateModalPrice();
    });
    optionsWrap.appendChild(btn);
  });

  updateModalPrice();
  document.getElementById('productModal').classList.remove('hidden');
}

function closeModal(){
  document.getElementById('productModal').classList.add('hidden');
  currentModalProduct = null;
}

function updateModalPrice(){
  const active = document.querySelector('#modalOptions button.active');
  const qty = Number(document.getElementById('modalQty').value || 1);
  const price = active ? Number(active.dataset.price || 0) * qty : 0;
  document.getElementById('modalPrice').textContent = `$${price.toFixed(2)}`;
}

document.getElementById && document.getElementById('modalQty')?.addEventListener('input', updateModalPrice);

function handleAddToCartFromModal(){
  if(!currentModalProduct) return;
  const active = document.querySelector('#modalOptions button.active');
  const optionName = active ? active.dataset.name : ((currentModalProduct.options && currentModalProduct.options[0])? currentModalProduct.options[0].name : 'Default');
  const unitPrice = active ? Number(active.dataset.price) : Number((currentModalProduct.options && currentModalProduct.options[0])? currentModalProduct.options[0].price : 0);
  const qty = Math.max(1, Number(document.getElementById('modalQty').value || 1));

  addToCart({
    productId: currentModalProduct.id,
    title: currentModalProduct.title,
    image: currentModalProduct.image,
    option: optionName,
    unitPrice,
    qty
  });

  closeModal();
}

// cart management
function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.warn('Failed to parse cart', e);
    return [];
  }
}

function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(CART));
}

function addToCart(item){
  // Check if same product+option exists and increment
  const existing = CART.find(i => i.productId === item.productId && i.option === item.option);
  if(existing){
    existing.qty += item.qty;
  } else {
    CART.push({...item});
  }
  saveCart();
  updateCartUI();
  renderCart();
}

function updateCartUI(){
  const count = CART.reduce((s,i)=>s + Number(i.qty||0), 0);
  document.getElementById('cartCountHeader').textContent = count;
  document.getElementById('cartCountFloat').textContent = count;
}

function renderCart(){
  const container = document.getElementById('cartItems');
  container.innerHTML = '';
  if(!CART.length){
    container.innerHTML = '<div class="muted" style="padding:18px;">Your cart is empty.</div>';
    document.getElementById('cartSubtotal').textContent = '$0.00';
    return;
  }
  let subtotal = 0;
  CART.forEach((it, idx) => {
    const el = document.createElement('div');
    el.className = 'cart-item';

    const img = document.createElement('img');
    img.src = it.image || 'logo.png';
    img.alt = it.title;

    const info = document.createElement('div');
    info.className = 'item-info';
    const h = document.createElement('h6');
    h.textContent = it.title;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${it.option} • $${Number(it.unitPrice).toFixed(2)} × ${it.qty}`;

    info.appendChild(h);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const minus = document.createElement('button'); minus.textContent = '-';
    minus.addEventListener('click', ()=> {
      it.qty = Math.max(0, it.qty - 1);
      if(it.qty <= 0) CART.splice(idx,1);
      saveCart(); updateCartUI(); renderCart();
    });

    const plus = document.createElement('button'); plus.textContent = '+';
    plus.addEventListener('click', ()=> {
      it.qty = Number(it.qty) + 1;
      saveCart(); updateCartUI(); renderCart();
    });

    const remove = document.createElement('button'); remove.textContent = 'Remove';
    remove.addEventListener('click', ()=> {
      if(confirm('Remove item?')) { CART.splice(idx,1); saveCart(); updateCartUI(); renderCart(); }
    });

    actions.appendChild(minus);
    actions.appendChild(plus);
    actions.appendChild(remove);

    el.appendChild(img);
    el.appendChild(info);
    el.appendChild(actions);

    container.appendChild(el);

    subtotal += Number(it.unitPrice) * Number(it.qty);
  });

  document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
}

// cart open/close
function openCart(e){
  e && e.preventDefault();
  document.getElementById('cartDrawer').classList.remove('hidden');
  document.getElementById('cartDrawer').setAttribute('aria-hidden', 'false');
  renderCart();
}
function closeCart(){
  document.getElementById('cartDrawer').classList.add('hidden');
  document.getElementById('cartDrawer').setAttribute('aria-hidden', 'true');
}

// tiny UX
function animateAdded(el){
  el.animate([
    { transform: 'translateY(0) scale(1)', opacity:1 },
    { transform: 'translateY(-6px) scale(.98)', opacity:0.9 },
    { transform: 'translateY(0) scale(1)', opacity:1 }
  ], { duration: 420, easing:'cubic-bezier(.2,.8,.2,1)' });
}

// expose updateModalPrice on qty change
document.addEventListener('input', (e) => {
  if(e.target && e.target.id === 'modalQty') updateModalPrice();
});

// Ensure new JSON entries push product list down (dynamic insertion)
window.addEventListener('storage', (e) => {
  if(e.key === 'products_updated_signal'){
    loadProducts();
  }
});
