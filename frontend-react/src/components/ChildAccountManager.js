import React, { useState } from 'react';
import { parentAPI } from '../services/api';

const ChildAccountManager = ({ onChildCreated, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    age: '',
    password: '',
    email: '',
    avatarUrl: '',
    maxDailyMinutes: '',
    allowedDays: [],
    requireParentApproval: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdChild, setCreatedChild] = useState(null); // Store created child with credentials

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter(d => d !== day)
        : [...prev.allowedDays, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.displayName || !formData.age) {
      setError('Username, display name, and age are required');
      return;
    }

    if (formData.age < 4 || formData.age > 17) {
      setError('Age must be between 4 and 17');
      return;
    }

    setLoading(true);

    try {
      const childData = {
        username: formData.username,
        displayName: formData.displayName,
        age: parseInt(formData.age),
        password: formData.password || `${formData.username}123`, // Use custom password or default
        email: formData.email || null, // Optional email
        avatarUrl: formData.avatarUrl || null,
        restrictions: {
          maxDailyMinutes: formData.maxDailyMinutes ? parseInt(formData.maxDailyMinutes) : null,
          allowedDays: formData.allowedDays.length > 0 ? formData.allowedDays : null,
          requireParentApproval: formData.requireParentApproval
        }
      };

      const res = await parentAPI.createChild(childData);
      
      // Store the created child with credentials to show them
      setCreatedChild({
        ...res.data.child,
        loginCredentials: res.data.loginCredentials
      });
      
      onChildCreated(res.data.child);
      // Don't close immediately - show credentials first
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create child account');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {createdChild ? (
            // Success screen with login credentials
            <div>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="font-display text-3xl text-slate-800 mb-2">Child Account Created!</h2>
                <p className="text-slate-600">Save these login credentials for your child</p>
              </div>

              <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-slate-800 mb-4 text-center">🔑 Login Credentials</h3>
                
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">Username</div>
                    <div className="font-mono text-lg font-bold text-indigo-600">
                      {createdChild.loginCredentials.username}
                    </div>
                  </div>
                  
                  {createdChild.loginCredentials.email && (
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-slate-600 mb-1">Email (can also be used to login)</div>
                      <div className="font-mono text-lg font-bold text-indigo-600">
                        {createdChild.loginCredentials.email}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1">Password</div>
                    <div className="font-mono text-lg font-bold text-indigo-600">
                      {createdChild.loginCredentials.password}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ <strong>Important:</strong> Write down these credentials! Your child can use either their username or email to log in.
                  </p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-slate-600">
                  <strong>{createdChild.displayName}</strong> can now log in at the login page using these credentials.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            // Create child form
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="font-display text-3xl text-slate-800 mb-2">Create Child Account 👦</h2>
                  <p className="text-slate-600">Add a new child to your parent account</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800">Basic Information</h3>
              
              <div>
                <label className="form-label">Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="coolkid123"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Used for login (no spaces)</p>
              </div>

              <div>
                <label className="form-label">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="child@email.com"
                />
                <p className="text-xs text-slate-500 mt-1">If provided, child can login with email or username</p>
              </div>

              <div>
                <label className="form-label">Display Name *</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Alex"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Shown in the app</p>
              </div>

              <div>
                <label className="form-label">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="10"
                  min="4"
                  max="17"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Must be between 4 and 17</p>
              </div>

              <div>
                <label className="form-label">Password (Optional)</label>
                <input
                  type="text"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Leave empty for auto-generated password"
                />
                <p className="text-xs text-slate-500 mt-1">
                  If empty, password will be: <strong>{formData.username || 'username'}123</strong>
                </p>
              </div>

              <div>
                <label className="form-label">Avatar URL (Optional)</label>
                <input
                  type="url"
                  name="avatarUrl"
                  value={formData.avatarUrl}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            {/* Restrictions */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="font-bold text-slate-800">Parental Controls (Optional)</h3>

              <div>
                <label className="form-label">Daily Time Limit (minutes)</label>
                <input
                  type="number"
                  name="maxDailyMinutes"
                  value={formData.maxDailyMinutes}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="60"
                  min="0"
                  max="1440"
                />
                <p className="text-xs text-slate-500 mt-1">Leave empty for no limit</p>
              </div>

              <div>
                <label className="form-label">Allowed Days</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${
                        formData.allowedDays.includes(day)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Leave empty to allow all days</p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="requireParentApproval"
                  checked={formData.requireParentApproval}
                  onChange={handleChange}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <label className="text-sm text-slate-700">
                  Require parent approval for new lessons
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Child Account'}
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildAccountManager;
