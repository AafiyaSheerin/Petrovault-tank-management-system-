import React from 'react';

const Loader = ({ size = 'medium', fullScreen = false }) => {
    const sizeClasses = {
        small: 'w-5 h-5 border-2',
        medium: 'w-8 h-8 border-3',
        large: 'w-12 h-12 border-4',
    };

    const spinner = (
        <div
            className={`${sizeClasses[size]} border-primary/20 border-t-primary rounded-full animate-spin`}
        />
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                {spinner}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-4">
            {spinner}
        </div>
    );
};

export default Loader;