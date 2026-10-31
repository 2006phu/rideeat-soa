import React from 'react';
import styled from 'styled-components';

const WaveInput = ({
  type = 'text',
  value = '',
  onChange,
  label = 'Tên đăng nhập',
  required = true,
  name = '',
  autoComplete = '',
  accentColor = '#00b14f',
  style = {}
}) => {
  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <StyledWrapper style={style} $accentColor={accentColor}>
      <div className="wave-group">
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          name={name}
          autoComplete={autoComplete}
          className={`input ${hasValue ? 'has-value' : ''}`}
        />
        <span className="bar" />
        <label className="label">
          {label.split('').map((char, index) => (
            <span
              key={index}
              className="label-char"
              style={{ '--index': index }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </label>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  width: 100%;
  margin-bottom: 22px;
  position: relative;

  .wave-group {
    position: relative;
    width: 100%;
  }

  .wave-group .input {
    font-size: 15px;
    padding: 12px 10px 10px 4px;
    display: block;
    width: 100%;
    border: none;
    border-bottom: 1.5px solid var(--border-color, #cbd5e1);
    background: transparent;
    color: var(--text-primary, #0f172a);
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }

  .wave-group .input:focus {
    outline: none;
  }

  .wave-group .label {
    color: var(--text-secondary, #94a3b8);
    font-size: 14px;
    font-weight: 500;
    position: absolute;
    pointer-events: none;
    left: 4px;
    top: 12px;
    display: flex;
    user-select: none;
  }

  .wave-group .label-char {
    transition: 0.2s cubic-bezier(0.16, 1, 0.3, 1) all;
    transition-delay: calc(var(--index) * 0.035s);
    display: inline-block;
  }

  .wave-group .input:focus ~ .label .label-char,
  .wave-group .input.has-value ~ .label .label-char,
  .wave-group .input:valid ~ .label .label-char {
    transform: translateY(-24px);
    font-size: 12px;
    font-weight: 700;
    color: ${(props) => props.$accentColor || '#00b14f'};
  }

  .wave-group .bar {
    position: relative;
    display: block;
    width: 100%;
  }

  .wave-group .bar:before,
  .wave-group .bar:after {
    content: '';
    height: 2.5px;
    width: 0;
    bottom: 0px;
    position: absolute;
    background: ${(props) => props.$accentColor || '#00b14f'};
    transition: 0.25s cubic-bezier(0.16, 1, 0.3, 1) all;
    border-radius: 2px;
  }

  .wave-group .bar:before {
    left: 50%;
  }

  .wave-group .bar:after {
    right: 50%;
  }

  .wave-group .input:focus ~ .bar:before,
  .wave-group .input:focus ~ .bar:after {
    width: 50%;
  }
`;

export default WaveInput;
