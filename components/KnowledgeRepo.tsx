import React, { useState, useEffect } from 'react';
import { DataService } from '../services/api';
import { Product, User } from '../types';

interface KnowledgeRepoProps {
  user?: User | null;
}

const KnowledgeRepo: React.FC<KnowledgeRepoProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'capabilities' | 'deployment' | 'commercials'>('overview');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: number, name: string }[]>([]);

  // DEBUG: Check user object
  console.log('KnowledgeRepo User:', user);
  console.log('KnowledgeRepo UserType:', user?.userType);
  console.log('KnowledgeRepo Category:', user?.partnerCategory);


  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await DataService.getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Access Control: 
      // Bronze: Overview only (no fetching products needed if just static? No, products drive Overview)
      // Actually per requirement:
      // Gold: Full Access
      // Silver: No Commercials
      // Bronze: Overview Only

      // We will handle TAB visibility in render. 
      // But we should also ensure data is fetched safely.
      // For now, let's fetch products for all, but hide tabs.

      const data = await DataService.getProducts();
      setProducts(data);
      if (data.length > 0 && !selectedProductId) {
        setSelectedProductId(data[0].id!);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Visibility Helpers
  // Visibility Helpers
  const canViewCommercials = () => {
    if (user?.role === 'Admin') return true;
    if (user?.userType?.toUpperCase() !== 'PARTNER') return true; // Internal
    return user?.partnerCategory === 'Gold'; // Only Gold
  };

  const canViewDeepDive = () => {
    if (user?.role === 'Admin') return true;
    if (user?.userType?.toUpperCase() !== 'PARTNER') return true; // Internal
    const cat = user?.partnerCategory || '';
    return cat === 'Gold' || cat === 'Silver'; // Gold & Silver
  };

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const can = (action: string) => {
    if (user?.role === 'Admin') return true;
    if (user?.roleName === 'Admin') return true;
    return user?.permissions?.includes(action);
  };

  const handleStartEdit = () => {
    setEditForm(JSON.parse(JSON.stringify(selectedProduct))); // Deep copy
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSave = async () => {
    try {
      if (editForm.id) {
        await DataService.updateProduct(editForm as Product);
      } else {
        await DataService.createProduct(editForm as Product);
      }
      await fetchProducts();
      setIsEditing(false);
      // If created, select it (logic simplified to just refresh for now)
    } catch (err) {
      alert('Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure?')) return;
    if (!selectedProduct?.id) return;
    try {
      await DataService.deleteProduct(selectedProduct.id);
      await fetchProducts();
      if (products.length > 1) setSelectedProductId(products[0].id!);
      else setSelectedProductId(null);
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleCreateNew = () => {
    setEditForm({
      name: 'New Product',
      category: 'General',
      description: '',
      problemSolved: '',
      notToSell: [],
      capabilities: [],
      deploymentModels: [],
      itLandscape: [],
      licensing: '',
      pricingBand: ''
    });
    setSelectedProductId(-1); // Temporary ID for UI
    setIsEditing(true);
  };

  // Helper to update array fields
  const updateArray = (field: keyof Product, index: number, value: any) => {
    const arr = [...(editForm[field] as any[])];
    arr[index] = value;
    setEditForm({ ...editForm, [field]: arr });
  };

  const addArrayItem = (field: keyof Product, item: any) => {
    const arr = [...(editForm[field] as any[] || []), item];
    setEditForm({ ...editForm, [field]: arr });
  };

  const removeArrayItem = (field: keyof Product, index: number) => {
    const arr = [...(editForm[field] as any[])];
    arr.splice(index, 1);
    setEditForm({ ...editForm, [field]: arr });
  };

  // RENDER HELPERS
  const renderProductSelector = () => {
    // Knowledge Repo Management is restricted to Admin and Product Managers
    const canManageKnowledge = user?.role === 'Admin' || user?.role === 'Product Manager';

    return (
      <div className="mb-6 flex items-center space-x-4">
        <select
          value={selectedProductId || ''}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            setSelectedProductId(id);
            setIsEditing(false);
          }}
          className="px-4 py-2 border rounded-lg bg-white shadow-sm font-bold text-slate-700 disabled:opacity-50"
          disabled={isEditing && !editForm.id}
        >
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        {!isEditing && canManageKnowledge && can('PRODUCTS_CREATE') && (
          <button onClick={handleCreateNew} className="text-sm font-bold text-blue-600 hover:underline">+ New Product</button>
        )}

        {!isEditing && selectedProductId && canManageKnowledge && can('PRODUCTS_UPDATE') && (
          <button onClick={handleStartEdit} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200">Edit Content</button>
        )}

        {!isEditing && selectedProductId && canManageKnowledge && can('PRODUCTS_DELETE') && (
          <button onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100">Delete</button>
        )}

        {isEditing && (
          <div className="flex space-x-2">
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Save Changes</button>
            <button onClick={handleCancelEdit} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300">Cancel</button>
          </div>
        )}
      </div>
    );
  };

  if (loading && products.length === 0) return <div className="p-8 text-center text-slate-500">Loading Knowledge Repository...</div>;

  const displayProduct = isEditing ? (editForm as Product) : selectedProduct;

  if (!displayProduct && !isEditing) return (
    <div className="p-12 text-center">
      <h3 className="text-xl font-bold text-slate-900">No Products Found</h3>
      {can('PRODUCTS_CREATE') && <button onClick={handleCreateNew} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold">Create First Product</button>}
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Knowledge Repository</h2>
          <p className="text-slate-500 mt-1">Foundational product and solution details.</p>
        </div>
        <div className="bg-white rounded-lg p-1 border border-slate-200 flex shadow-sm">
          {([
            { id: 'overview', label: 'Overview', visible: true },
            { id: 'capabilities', label: 'Capabilities', visible: canViewDeepDive() },
            { id: 'deployment', label: 'Deployment', visible: canViewDeepDive() },
            { id: 'commercials', label: 'Commercials', visible: canViewCommercials() }
          ] as const)
            .filter(t => t.visible)
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
        </div>
      </header>

      {renderProductSelector()}

      {/* EDIT FORM HEADER (NAME/CATEGORY) */}
      {isEditing && (
        <div className="mb-8 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Product Name</label>

            <input type="text" className="w-full p-2 border rounded" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase">Category</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={editForm.category}
              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
              placeholder="Enter category (e.g. Cloud, Security)"
            />
          </div>
        </div >
      )}

      {/* --- OVERVIEW TAB --- */}
      {
        activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{displayProduct?.name} Overview</h3>
              {isEditing ? (
                <textarea
                  className="w-full h-32 p-3 border rounded-lg"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Product Description..."
                />
              ) : (
                <p className="text-lg text-slate-700 leading-relaxed max-w-4xl italic border-l-4 border-blue-500 pl-6">
                  "{displayProduct?.description || 'No description'}"
                </p>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">What business problem it solves</h4>
                {isEditing ? (
                  <textarea
                    className="w-full h-32 p-3 border rounded-lg"
                    value={editForm.problemSolved}
                    onChange={e => setEditForm({ ...editForm, problemSolved: e.target.value })}
                  />
                ) : (
                  <p className="text-slate-600">{displayProduct?.problemSolved || 'N/A'}</p>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">When NOT to sell</h4>
                {isEditing ? (
                  <div className="space-y-2">
                    {(editForm.notToSell || []).map((item, i) => (
                      <div key={i} className="flex space-x-2">
                        <input className="flex-1 p-2 border rounded" value={item} onChange={e => updateArray('notToSell', i, e.target.value)} />
                        <button onClick={() => removeArrayItem('notToSell', i)} className="text-red-500 font-bold">X</button>
                      </div>
                    ))}
                    <button onClick={() => addArrayItem('notToSell', '')} className="text-sm text-blue-600 font-bold">+ Add Item</button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {(displayProduct?.notToSell || []).map((item, i) => (
                      <li key={i} className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <span>• {item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* --- CAPABILITIES TAB --- */}
      {
        activeTab === 'capabilities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            {(displayProduct?.capabilities || []).map((cap, i) => (
              <div key={i} className="group p-6 rounded-xl border border-slate-100 hover:bg-blue-50/30 transition-all">
                {isEditing ? (
                  <div className="space-y-3">
                    <input className="w-full p-2 border rounded font-bold" placeholder="Title" value={cap.title} onChange={e => {
                      const newCap = { ...cap, title: e.target.value };
                      updateArray('capabilities', i, newCap);
                    }} />
                    <input className="w-full p-2 border rounded text-xs" placeholder="Purpose" value={cap.whatItDoes} onChange={e => {
                      const newCap = { ...cap, whatItDoes: e.target.value };
                      updateArray('capabilities', i, newCap);
                    }} />
                    <input className="w-full p-2 border rounded text-xs" placeholder="Value" value={cap.whyItMatters} onChange={e => {
                      const newCap = { ...cap, whyItMatters: e.target.value };
                      updateArray('capabilities', i, newCap);
                    }} />
                    <input className="w-full p-2 border rounded text-xs" placeholder="Use Case" value={cap.useCase} onChange={e => {
                      const newCap = { ...cap, useCase: e.target.value };
                      updateArray('capabilities', i, newCap);
                    }} />
                    <button onClick={() => removeArrayItem('capabilities', i)} className="text-red-600 text-xs font-bold">Remove Capability</button>
                  </div>
                ) : (
                  <>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">{cap.title}</h4>
                    <div className="space-y-4">
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Purpose</span><p className="text-sm text-slate-600">{cap.whatItDoes}</p></div>
                      <div><span className="text-xs font-bold text-slate-400 uppercase">Value</span><p className="text-sm text-slate-600">{cap.whyItMatters}</p></div>
                      <div className="bg-white p-3 rounded-lg border text-xs italic text-slate-500"><strong>Use Case:</strong> {cap.useCase}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {isEditing && (
              <button onClick={() => addArrayItem('capabilities', { title: '', whatItDoes: '', whyItMatters: '', useCase: '' })} className="p-6 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 font-bold hover:border-blue-500 hover:text-blue-500">
                + Add Capability
              </button>
            )}
          </div>
        )
      }

      {/* --- DEPLOYMENT TAB --- */}
      {
        activeTab === 'deployment' && (
          <div className="space-y-8 animate-fadeIn">
            {isEditing ? (
              <div className="space-y-4">
                <h4 className="font-bold">Deployment Models</h4>
                {(editForm.deploymentModels || []).map((m, i) => (
                  <div key={i} className="flex space-x-2"><input className="flex-1 p-2 border rounded" value={m} onChange={e => updateArray('deploymentModels', i, e.target.value)} /><button onClick={() => removeArrayItem('deploymentModels', i)}>X</button></div>
                ))}
                <button onClick={() => addArrayItem('deploymentModels', '')} className="text-blue-600">+ Add Model</button>

                <h4 className="font-bold mt-6">IT Landscape (Integration Points)</h4>
                {(editForm.itLandscape || []).map((m, i) => (
                  <div key={i} className="flex space-x-2"><input className="flex-1 p-2 border rounded" value={m} onChange={e => updateArray('itLandscape', i, e.target.value)} /><button onClick={() => removeArrayItem('itLandscape', i)}>X</button></div>
                ))}
                <button onClick={() => addArrayItem('itLandscape', '')} className="text-blue-600">+ Add Point</button>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-xl p-12 text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Architecture Focus</h3>
                <div className="mt-8 flex justify-center space-x-4">
                  {(displayProduct?.deploymentModels || []).map(m => (
                    <span key={m} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-blue-300 text-sm font-medium">{m}</span>
                  ))}
                </div>
                <div className="mt-8 text-left max-w-lg mx-auto bg-slate-800 p-6 rounded-xl">
                  <h4 className="text-white font-bold mb-4">Integration Points</h4>
                  <ul className="list-disc list-inside text-slate-400 space-y-2">
                    {(displayProduct?.itLandscape || []).map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* --- COMMERCIALS TAB --- */}
      {
        activeTab === 'commercials' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 rounded-xl">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Licensing Model</h4>
                {isEditing ? <input className="w-full p-2 border rounded" value={editForm.licensing} onChange={e => setEditForm({ ...editForm, licensing: e.target.value })} /> : <p className="text-slate-700 font-medium">{displayProduct?.licensing}</p>}
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Pricing Band</h4>
                {isEditing ? <input className="w-full p-2 border rounded" value={editForm.pricingBand} onChange={e => setEditForm({ ...editForm, pricingBand: e.target.value })} /> : <p className="text-xl font-bold text-blue-600">{displayProduct?.pricingBand}</p>}
              </div>
            </div>
          </div>
        )
      }

    </div>
  )
}

export default KnowledgeRepo;
