const { data, saveData, deleteItem } = require('../app.js');

describe('Data Management', () => {
  beforeEach(() => {
    // Reset data for each test
    data.transactions = [];
    data.debts = [];
    data.goals = [];
    
    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
  });

  test('should add transaction and save', () => {
    const transaction = {
      id: 1,
      date: '2025-11-10',
      type: 'expense',
      amount: 100,
      category: 'Food',
      desc: 'Lunch'
    };
    
    data.transactions.push(transaction);
    saveData();
    
    expect(data.transactions).toHaveLength(1);
    expect(localStorage.setItem).toHaveBeenCalledWith('budgetData', expect.any(String));
  });

  test('should delete transaction', () => {
    data.transactions = [{ id: 1, amount: 100 }];
    
    // Mock confirm to return true
    global.confirm = jest.fn(() => true);
    
    deleteItem('transactions', 1);
    
    expect(data.transactions).toHaveLength(0);
  });
});