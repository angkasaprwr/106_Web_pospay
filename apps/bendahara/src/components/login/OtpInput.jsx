import { useRef } from 'react';

export default function OtpInput({ value, onChange, length = 6 }) {
  const inputs = useRef([]);

  const digits = value.padEnd(length, ' ').split('').slice(0, length);

  const update = (next) => {
    onChange(next.replace(/\D/g, '').slice(0, length));
  };

  const handleChange = (index, char) => {
    const clean = char.replace(/\D/g, '');
    if (!clean) {
      const arr = digits.map((d) => (d === ' ' ? '' : d));
      arr[index] = '';
      update(arr.join(''));
      return;
    }
    const arr = digits.map((d) => (d === ' ' ? '' : d));
    arr[index] = clean.slice(-1);
    const next = arr.join('');
    update(next);
    if (index < length - 1 && clean) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    update(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`h-12 w-10 rounded-xl border-2 text-center text-xl font-bold outline-none transition sm:h-14 sm:w-12 sm:text-2xl ${
            digit.trim()
              ? 'border-pospay bg-pospay-50 text-pospay'
              : 'border-slate-200 bg-white text-slate-800 focus:border-pospay focus:ring-2 focus:ring-pospay/20'
          }`}
          aria-label={`Digit kode ${i + 1}`}
        />
      ))}
    </div>
  );
}
