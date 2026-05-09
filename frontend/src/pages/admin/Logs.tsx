import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Download, ChevronUp, ChevronDown } from 'lucide-react';

interface Log {
  id: number;
  user_id: number;
  username: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

const Logs = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [serverLogs, setServerLogs] = useState('');
  const [sortConfig, setSortConfig] = useState<{key: string, order: 'asc'|'desc'|'none'}>({ key: 'date', order: 'desc' });
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consoleRef = useRef<HTMLPreElement>(null);

  const fetchLogs = async () => {
    try {
      const [dbRes, consoleRes] = await Promise.all([
        api.get('/admin/logs'),
        api.get('/admin/server_logs').catch(() => ({ data: { logs: '' } }))
      ]);
      setLogs(dbRes.data);
      setServerLogs(consoleRes.data.logs);
      if (loading) setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (filter === 'console' && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [serverLogs, filter]);

  useEffect(() => {
    fetchLogs();
    pollingRef.current = setInterval(fetchLogs, 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('SUCCESS') || action.includes('register')) return 'text-green-400';
    if (action.includes('FAILED') || action.includes('block') || action.includes('ban')) return 'text-red-400';
    return 'text-gray-300';
  };

  let processedLogs = [...logs];
  
  if (sortConfig.order !== 'none') {
    processedLogs.sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortConfig.order === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortConfig.key === 'action') {
        return sortConfig.order === 'asc' 
          ? a.action.localeCompare(b.action) 
          : b.action.localeCompare(a.action);
      }
      return 0;
    });
  }

  const filteredLogs = processedLogs.filter(log => {
    let matchesType = true;
    if (filter === 'all') {
        matchesType = true;
    } else if (filter === 'auth') {
        matchesType = log.action.toUpperCase().includes('LOGIN') || 
                      log.action.toUpperCase().includes('REGISTER') || 
                      log.action.toUpperCase().includes('DENIED') || 
                      log.action.toUpperCase().includes('FAILED');
    } else if (filter === 'admin') {
        matchesType = log.action.toLowerCase().includes('block') || 
                      log.action.toLowerCase().includes('role') || 
                      log.action.toLowerCase().includes('password') || 
                      log.action.toUpperCase().includes('BANNED') || 
                      log.action.toUpperCase().includes('UNBANNED');
    } else if (filter === 'console') {
        matchesType = false;
    }
    
    let matchesUser = true;
    if (userFilter) matchesUser = log.username.toLowerCase() === userFilter.toLowerCase();
    
    return matchesType && matchesUser;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | 'none' = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.order === 'asc') direction = 'desc';
      else if (sortConfig.order === 'desc') direction = 'none';
    }
    setSortConfig({ key, order: direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || sortConfig.order === 'none') return <span className="inline-block w-[14px] ml-1"></span>;
    if (sortConfig.order === 'asc') return <ChevronUp size={14} className="inline ml-1 text-gray-500" />;
    return <ChevronDown size={14} className="inline ml-1 text-gray-500" />;
  };

  const handleExport = () => {
    if (filter === 'console') {
      const blob = new Blob([serverLogs], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `server_console_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const headers = ['Дата', 'Пользователь', 'Действие', 'Детали'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString('ru-RU'),
      log.username,
      log.action,
      log.details || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n"
      + rows.map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    let tabName = filter === 'all' ? 'all' : filter === 'auth' ? 'auth' : 'admin';
    link.setAttribute("download", `system_logs_${tabName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Системные логи</h1>
        <p className="text-gray-400 mt-1">История входов и ошибок.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex gap-2 flex-wrap justify-center">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white/20 text-white border border-white/30' : 'glass-button'}`}
          >
            Все
          </button>
          <button 
            onClick={() => setFilter('auth')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'auth' ? 'bg-white/20 text-white border border-white/30' : 'glass-button'}`}
          >
            Авторизация
          </button>
          <button 
            onClick={() => setFilter('admin')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'admin' ? 'bg-white/20 text-white border border-white/30' : 'glass-button'}`}
          >
            Действия админов
          </button>
          <button 
            onClick={() => setFilter('console')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === 'console' ? 'bg-black text-green-400 shadow-sm' : 'glass-button'}`}
          >
            Консоль сервера
          </button>
          
          {userFilter && (
            <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-2 rounded-xl text-sm font-medium border border-red-500/30">
              Пользователь: @{userFilter}
              <button onClick={() => setUserFilter('')} className="hover:text-red-300 font-bold ml-1">&times;</button>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Download size={16} />
          Экспорт {filter === 'console' ? 'TXT' : 'CSV'}
        </button>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Загрузка логов...</div>
        ) : filter === 'console' ? (
          <pre ref={consoleRef} className="bg-black text-green-400 p-6 font-mono text-xs overflow-y-auto h-[600px] whitespace-pre-wrap rounded-2xl">
            {serverLogs || "Ожидание логов..."}
          </pre>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Логов не найдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white font-bold text-sm">
                  <th 
                    className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" 
                    onClick={() => handleSort('date')}
                  >
                    Дата {getSortIcon('date')}
                  </th>
                  <th className="py-4 px-6">Пользователь</th>
                  <th 
                    className="py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors select-none" 
                    onClick={() => handleSort('action')}
                  >
                    Действие {getSortIcon('action')}
                  </th>
                  <th className="py-4 px-6">Детали</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-6 text-gray-400 font-medium">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="py-3 px-6">
                      <button 
                        onClick={() => setUserFilter(log.username)}
                        className="font-medium text-gray-300 hover:text-red-400 transition-colors"
                      >
                        {log.username}
                      </button>
                    </td>
                    <td className="py-3 px-6">
                      <span className={`font-bold uppercase text-xs tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-gray-400 font-medium">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Logs;
