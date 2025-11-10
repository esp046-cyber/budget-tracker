const { ModalManager } = require('../app.js');

describe('ModalManager', () => {
  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <div id="universal-modal" style="display: none;">
        <h2 id="modal-title"></h2>
        <p id="modal-desc"></p>
        <input id="modal-date" type="date">
        <input id="modal-amount" type="number">
      </div>
    `;
  });

  test('should open modal with correct data', () => {
    ModalManager.open('debt', 0, 'Test Debt', 'Test Description');
    
    expect(ModalManager.activeType).toBe('debt');
    expect(ModalManager.activeIndex).toBe(0);
    expect(document.getElementById('modal-title').textContent).toBe('Test Debt');
    expect(document.getElementById('modal-desc').textContent).toBe('Test Description');
    expect(document.getElementById('universal-modal').style.display).toBe('flex');
  });

  test('should close modal', () => {
    ModalManager.open('debt', 0, 'Test', 'Test');
    ModalManager.close();
    
    expect(ModalManager.activeType).toBeNull();
    expect(ModalManager.activeIndex).toBeNull();
    expect(document.getElementById('universal-modal').style.display).toBe('none');
  });
});