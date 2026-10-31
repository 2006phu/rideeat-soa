import React from 'react';
import styled from 'styled-components';

const StarRating = ({
  value = 5,
  onChange,
  name = 'star-rating',
  size = '2rem'
}) => {
  const stars = [5, 4, 3, 2, 1];

  return (
    <StyledWrapper $size={size}>
      <div className="rating">
        {stars.map((star) => {
          const inputId = `${name}-star-${star}`;
          return (
            <React.Fragment key={star}>
              <input
                type="radio"
                id={inputId}
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange && onChange(star)}
              />
              <label htmlFor={inputId} title={`${star} sao`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    pathLength={360}
                    d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"
                  />
                </svg>
              </label>
            </React.Fragment>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;

  .rating {
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-end;
    gap: 0.35rem;
    --stroke: #94a3b8;
    --fill: #ffc73a;
  }

  .rating input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .rating label {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .rating label:hover {
    transform: scale(1.15);
  }

  .rating svg {
    width: ${(props) => props.$size || '2rem'};
    height: ${(props) => props.$size || '2rem'};
    overflow: visible;
    fill: transparent;
    stroke: var(--stroke);
    stroke-linejoin: bevel;
    stroke-dasharray: 12;
    animation: idle 4s linear infinite;
    transition: stroke 0.2s, fill 0.5s;
  }

  @keyframes idle {
    from {
      stroke-dashoffset: 24;
    }
  }

  .rating label:hover svg,
  .rating label:hover ~ label svg {
    stroke: var(--fill);
    fill: rgba(255, 199, 58, 0.25);
  }

  .rating input:checked ~ label svg {
    transition: 0s;
    animation: idle 4s linear infinite, yippee 0.75s backwards;
    fill: var(--fill);
    stroke: var(--fill);
    stroke-opacity: 0;
    stroke-dasharray: 0;
    stroke-linejoin: miter;
    stroke-width: 8px;
  }

  @keyframes yippee {
    0% {
      transform: scale(1);
      fill: var(--fill);
      fill-opacity: 0;
      stroke-opacity: 1;
      stroke: var(--stroke);
      stroke-dasharray: 10;
      stroke-width: 1px;
      stroke-linejoin: bevel;
    }

    30% {
      transform: scale(0);
      fill: var(--fill);
      fill-opacity: 0;
      stroke-opacity: 1;
      stroke: var(--stroke);
      stroke-dasharray: 10;
      stroke-width: 1px;
      stroke-linejoin: bevel;
    }

    30.1% {
      stroke: var(--fill);
      stroke-dasharray: 0;
      stroke-linejoin: miter;
      stroke-width: 8px;
    }

    60% {
      transform: scale(1.2);
      fill: var(--fill);
    }
  }
`;

export default StarRating;
