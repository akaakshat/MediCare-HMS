import React, { useEffect, useState } from 'react';
import { ApiClient } from '../../../utils/api';

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultFee, setDefaultFee] = useState<number | ''>('');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await ApiClient.get('/settings').catch(() => null);
        const s = res?.settings ?? null;
        if (s) {
          setClinicName(s.clinicName || '');
          setClinicAddress(s.clinicAddress || '');
          setContactNumber(s.contactNumber || '');
          setClinicEmail(s.clinicEmail || '');
          setTheme(s.theme === 'dark' ? 'dark' : 'light');
          setPrimaryColor(s.primaryColor || '#2563eb');
          setNotificationsEnabled(s.notificationsEnabled !== false);
          setDefaultFee(s.defaultFee ?? '');
          setLanguage(s.language === 'hi' ? 'hi' : 'en');
        } else {
          // fallback to localStorage
          const local = localStorage.getItem('app_settings');
          if (local) {
            const ls = JSON.parse(local);
            setClinicName(ls.clinicName || '');
            setClinicAddress(ls.clinicAddress || '');
            setContactNumber(ls.contactNumber || '');
            setClinicEmail(ls.clinicEmail || '');
            setTheme(ls.theme || 'light');
            setPrimaryColor(ls.primaryColor || '#2563eb');
            setNotificationsEnabled(ls.notificationsEnabled !== false);
            setDefaultFee(ls.defaultFee ?? '');
            setLanguage(ls.language || 'en');
          }
        }
      } catch (err) {
        console.error('Load settings failed', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const payload = {
      clinicName,
      clinicAddress,
      contactNumber,
      clinicEmail,
      theme,
      primaryColor,
      notificationsEnabled,
      defaultFee,
      language,
    };

    try {
      // try backend
      await ApiClient.post('/settings', payload).catch(() => null);
      // always persist locally as fallback
      localStorage.setItem('app_settings', JSON.stringify(payload));
      alert('Settings saved');
    } catch (err) {
      console.error('Save settings failed', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert('Provide both current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    try {
      await ApiClient.post('/auth/change-password', { currentPassword, newPassword }).catch(() => null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password updated (if backend supported it).');
    } catch (err) {
      console.error(err);
      alert('Password change failed');
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm max-w-3xl">
      <h2 className="text-lg font-medium mb-4">Settings</h2>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Clinic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={clinicName} onChange={e=>setClinicName(e.target.value)} placeholder="Clinic Name" className="input" />
          <input value={clinicEmail} onChange={e=>setClinicEmail(e.target.value)} placeholder="Email" className="input" />
          <input value={contactNumber} onChange={e=>setContactNumber(e.target.value)} placeholder="Contact Number" className="input" />
          <input value={clinicAddress} onChange={e=>setClinicAddress(e.target.value)} placeholder="Clinic Address" className="input" />
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Current password" className="input" />
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password" className="input" />
          <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm password" className="input" />
        </div>
        <div className="mt-2">
          <button onClick={changePassword} className="px-3 py-2 bg-blue-600 text-white rounded">Update Password</button>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Theme / Appearance</h3>
        <div className="flex items-center gap-4 mb-3">
          <label className="flex items-center gap-2"><input type="radio" name="theme" checked={theme==='light'} onChange={()=>setTheme('light')} /> Light</label>
          <label className="flex items-center gap-2"><input type="radio" name="theme" checked={theme==='dark'} onChange={()=>setTheme('dark')} /> Dark</label>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">Dashboard Color: <input type="color" value={primaryColor} onChange={e=>setPrimaryColor(e.target.value)} className="w-10 h-8 p-0 border-0"/></label>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Notifications</h3>
        <label className="flex items-center gap-2"><input type="checkbox" checked={notificationsEnabled} onChange={e=>setNotificationsEnabled(e.target.checked)} /> Enable appointment notifications</label>
      </section>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Default Consultation Fee</h3>
        <input type="number" value={defaultFee as any} onChange={e=>setDefaultFee(e.target.value ? Number(e.target.value) : '')} placeholder="Default fee" className="input w-48" />
      </section>

      <section className="mb-6">
        <h3 className="font-medium mb-2">Language</h3>
        <select value={language} onChange={e=>setLanguage(e.target.value as any)} className="input w-48">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={saveSettings} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded">Save Settings</button>
        <button onClick={()=>{localStorage.removeItem('app_settings'); alert('Local settings reset');}} className="px-4 py-2 border rounded">Reset Local</button>
      </div>
    </div>
  );
}

export default Settings;
