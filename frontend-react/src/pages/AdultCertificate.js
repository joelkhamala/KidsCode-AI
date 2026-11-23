import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdultCertificate = () => {
  const navigate = useNavigate();
  const [eligibility, setEligibility] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const token = localStorage.getItem('adult_token');
      const response = await fetch('http://localhost:3000/api/adult/certificate/eligibility', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check eligibility');
      }

      const data = await response.json();
      setEligibility(data);

      // Check if certificate already exists
      if (data.eligible) {
        const certResponse = await fetch('http://localhost:3000/api/adult/certificate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (certResponse.ok) {
          const certData = await certResponse.json();
          if (certData.certificate) {
            setCertificate(certData.certificate);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async () => {
    setGenerating(true);
    setError('');

    try {
      const token = localStorage.getItem('adult_token');
      const response = await fetch('http://localhost:3000/api/adult/certificate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate certificate');
      }

      const data = await response.json();
      setCertificate(data.certificate);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-gray-600">Loading certificate status...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/adult/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </button>
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🎓 Certificate of Completion
              </h1>
              <p className="text-sm text-gray-600">
                ICT/CU/CP/CR/08/6/A - Client-Side Web Development
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Certificate Display */}
        {certificate ? (
          <div className="bg-white rounded-xl shadow-lg border-4 border-indigo-600 p-12 mb-8">
            <div className="text-center">
              <div className="text-6xl mb-6">🎓</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Certificate of Completion
              </h2>
              <p className="text-gray-600 mb-8">
                This certifies that
              </p>
              <h3 className="text-4xl font-bold text-indigo-600 mb-8">
                {certificate.learner_name}
              </h3>
              <p className="text-gray-700 mb-4">
                has successfully completed the
              </p>
              <h4 className="text-2xl font-bold text-gray-900 mb-8">
                Client-Side Web Development Course
              </h4>
              <p className="text-gray-600 mb-2">
                ICT/CU/CP/CR/08/6/A
              </p>
              <p className="text-gray-600 mb-8">
                170 Hours of Professional Training
              </p>
              
              <div className="grid grid-cols-3 gap-8 mb-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{eligibility?.completedLessons}</div>
                  <div className="text-sm text-gray-600">Lessons Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{eligibility?.hoursLogged}h</div>
                  <div className="text-sm text-gray-600">Hours Logged</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{eligibility?.averageScore}%</div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-6">
                <p className="text-sm text-gray-500">
                  Certificate ID: {certificate.certificate_id}
                </p>
                <p className="text-sm text-gray-500">
                  Issued: {new Date(certificate.issued_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Eligibility Status */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">
                {eligibility?.eligible ? '🎉' : '📚'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {eligibility?.eligible 
                  ? 'Congratulations! You\'re Eligible!' 
                  : 'Keep Learning!'}
              </h2>
              <p className="text-gray-600">
                {eligibility?.eligible
                  ? 'You\'ve met all requirements for certification'
                  : 'Complete the requirements below to earn your certificate'}
              </p>
            </div>

            {/* Requirements */}
            <div className="space-y-4 mb-8">
              <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                eligibility?.requirements?.allLessonsComplete
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-3xl">
                  {eligibility?.requirements?.allLessonsComplete ? '✅' : '⏳'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Complete All Lessons</div>
                  <div className="text-sm text-gray-600">
                    {eligibility?.completedLessons || 0}/{eligibility?.totalLessons || 0} lessons completed
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                eligibility?.requirements?.minimumHours
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-3xl">
                  {eligibility?.requirements?.minimumHours ? '✅' : '⏳'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Log 170 Hours</div>
                  <div className="text-sm text-gray-600">
                    {eligibility?.hoursLogged || 0}/170 hours logged
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                eligibility?.requirements?.passingGrade
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="text-3xl">
                  {eligibility?.requirements?.passingGrade ? '✅' : '⏳'}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Achieve 70% Average</div>
                  <div className="text-sm text-gray-600">
                    Current average: {eligibility?.averageScore || 0}%
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {eligibility?.eligible ? (
              <button
                onClick={generateCertificate}
                disabled={generating}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating Certificate...' : '🎓 Generate Certificate'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/adult/dashboard')}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700"
              >
                Continue Learning
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdultCertificate;
