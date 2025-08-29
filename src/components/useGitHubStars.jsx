import { useEffect, useState } from 'react';

export const useGitHubStars = () => {
  const [stars, setStars] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/y-shi23/Navinocode');
        if (!response.ok) {
          throw new Error('Failed to fetch GitHub stars');
        }
        const data = await response.json();
        setStars(data.stargazers_count);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, []);

  return { stars, loading, error };
};
