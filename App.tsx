
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Subscribers from './components/Subscribers';
import Billing from './components/Billing';
import Payments from './components/Payments';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Login from './components/Login';
import { AppData, Subscriber, Invoice } from './types';
import { loadData, saveData } from './utils/storage';
import { syncToAppSheet } from './services/appSheetService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<AppData>(loadData());
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('water_mgmt_auth') === 'true';
  });
  const prevDataRef = useRef<AppData>(data);
  const isInitialMount = useRef(true);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    saveData(data);

    // Skip sync on initial mount to improve loading performance
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevDataRef.current = data;
      return;
    }

    // Cloud Sync Logic (AppSheet) - with debounce and optional auto-sync
    if (data.appSheetConfig?.enabled && data.appSheetConfig?.autoSync) {
      // Clear previous timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce: wait 500ms before syncing
      syncTimeoutRef.current = setTimeout(() => {
        handleCloudSync();
      }, 500);
    }

    prevDataRef.current = data;
  }, [data]);

  const handleCloudSync = async () => {
    const prev = prevDataRef.current;
    if (!data.appSheetConfig) return;
    const config = data.appSheetConfig;

    try {
      // Check for new subscribers
      if (data.subscribers.length > prev.subscribers.length) {
        const newSubs = data.subscribers.filter(s => !prev.subscribers.find(ps => ps.id === s.id));
        if (newSubs.length > 0) {
          await syncToAppSheet('Subscribers', 'Add', newSubs, config);
        }
      }

      // Check for updated subscribers
      const updatedSubs = data.subscribers.filter(s => {
        const ps = prev.subscribers.find(p => p.id === s.id);
        return ps && JSON.stringify(ps) !== JSON.stringify(s);
      });
      if (updatedSubs.length > 0) {
        await syncToAppSheet('Subscribers', 'Edit', updatedSubs, config);
      }

      // Check for new invoices
      if (data.invoices.length > prev.invoices.length) {
        const newInvoices = data.invoices.filter(i => !prev.invoices.find(pi => pi.id === i.id));
        if (newInvoices.length > 0) {
          await syncToAppSheet('Invoices', 'Add', newInvoices, config);
        }
      }

      // Check for updated invoices (payments)
      const updatedInvoices = data.invoices.filter(i => {
        const pi = prev.invoices.find(p => p.id === i.id);
        return pi && JSON.stringify(pi) !== JSON.stringify(i);
      });
      if (updatedInvoices.length > 0) {
        await syncToAppSheet('Invoices', 'Edit', updatedInvoices, config);
      }
    } catch (error) {
      console.error('Auto-sync failed:', error);
      // Don't show alert for auto-sync failures to avoid disrupting user
    }
  };

  const handleLogin = (username: string, pass: string): boolean => {
    if (username === data.authConfig.username && pass === data.authConfig.password) {
      setIsLoggedIn(true);
      sessionStorage.setItem('water_mgmt_auth', 'true');
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('water_mgmt_auth');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard data={data} />;
      case 'subscribers': return <Subscribers data={data} setData={setData} />;
      case 'billing': return <Billing data={data} setData={setData} />;
      case 'payments': return <Payments data={data} setData={setData} />;
      case 'reports': return <Reports data={data} />;
      case 'settings': return <Settings data={data} setData={setData} />;
      default: return <Dashboard data={data} />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      data={data}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
