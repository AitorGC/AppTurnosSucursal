import React from 'react';
import { CalendarClock } from 'lucide-react';

const IconATR = ({ className, ...props }) => {
    return (
        <CalendarClock 
            className={className || "w-6 h-6 text-companyBlue"} 
            {...props} 
        />
    );
};

export default IconATR;
