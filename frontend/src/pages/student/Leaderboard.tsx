import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Trophy, Medal } from 'lucide-react';

interface Result {
  student_name: string;
  score: number;
  passed: boolean;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<{username: string, score: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd have a specific /leaderboard endpoint,
    // but for now we can fetch all public results or simulate it if the API doesn't exist.
    // Wait, as a student we only have access to /results for OURSELVES right now!
    // We need to add a GET /leaderboard endpoint to student.py!
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard');
      setLeaderboard(res.data);
    } catch (e) {
      console.error("Failed to fetch leaderboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white mb-8 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy size={32} className="text-yellow-300" /> 
            Зал Славы
          </h1>
          <p className="mt-2 text-indigo-100 max-w-xl">
            Топ студентов платформы. Зарабатывай баллы за прохождение лекций и экзаменов, чтобы подняться выше!
          </p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-indigo-500/20">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка рейтинга...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-4 font-semibold text-gray-300 w-24 text-center">Место</th>
                <th className="p-4 font-semibold text-gray-300">Студент</th>
                <th className="p-4 font-semibold text-gray-300 text-right">Баллы</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaderboard.map((user, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-center font-bold text-gray-400">
                    {i === 0 && <Medal size={24} className="text-yellow-400 mx-auto" />}
                    {i === 1 && <Medal size={24} className="text-gray-300 mx-auto" />}
                    {i === 2 && <Medal size={24} className="text-amber-500 mx-auto" />}
                    {i > 2 && `#${i + 1}`}
                  </td>
                  <td className="p-4 font-semibold text-white text-lg">
                    {user.username}
                  </td>
                  <td className="p-4 text-right font-bold text-indigo-400 text-xl">
                    {user.score}
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">Рейтинг пока пуст</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
