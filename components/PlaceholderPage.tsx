
import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500">هذه الصفحة قيد الإنشاء حاليًا.</p>
      </div>
    </div>
  );
};
