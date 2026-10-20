import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { JOD_PER_USD, usdToJod, jodToUsd } from '../services/currency';

interface PaymentAmountFieldsProps {
    /** Amount in USD - the only value that is persisted. */
    value: number | string;
    onChange: (usd: number) => void;
    language: Language;
    inputClasses: string;
    labelClasses: string;
}

const labels = {
    ar: { usd: 'المبلغ (USD)', jod: 'المبلغ (JOD)', rate: 'سعر الصرف' },
    en: { usd: 'USD Amount', jod: 'JOD Amount', rate: 'Exchange rate' },
};

// Two linked inputs: typing in either one fills the other at JOD_PER_USD.
// The raw text is kept locally so partial input like "12." isn't rewritten
// while typing; it re-syncs when the parent value changes from outside
// (e.g. switching to another milestone).
const PaymentAmountFields: React.FC<PaymentAmountFieldsProps> = ({ value, onChange, language, inputClasses, labelClasses }) => {
    const t = labels[language];
    const fmt = (n: number) => (n ? String(n) : '');
    const [usdText, setUsdText] = useState(fmt(Number(value) || 0));
    const [jodText, setJodText] = useState(fmt(usdToJod(Number(value) || 0)));

    useEffect(() => {
        const v = Number(value) || 0;
        if (v !== (parseFloat(usdText) || 0)) {
            setUsdText(fmt(v));
            setJodText(fmt(usdToJod(v)));
        }
    }, [value]);

    const handleUsd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        const usd = parseFloat(text) || 0;
        setUsdText(text);
        setJodText(fmt(usdToJod(usd)));
        onChange(usd);
    };

    const handleJod = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        const usd = jodToUsd(parseFloat(text) || 0);
        setJodText(text);
        setUsdText(fmt(usd));
        onChange(usd);
    };

    return (
        <>
            <div>
                <label className={labelClasses}>{t.usd}</label>
                <input type="number" min="0" step="any" value={usdText} onChange={handleUsd} className={inputClasses} placeholder="0.00" />
            </div>
            <div>
                <label className={labelClasses}>{t.jod} <span className="normal-case opacity-60">({t.rate} {JOD_PER_USD})</span></label>
                <input type="number" min="0" step="any" value={jodText} onChange={handleJod} className={inputClasses} placeholder="0.00" />
            </div>
        </>
    );
};

export default PaymentAmountFields;
