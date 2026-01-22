import React from 'react';
import styled, { keyframes } from 'styled-components';

export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

export const Section = styled.section`
  padding: 80px 0;
`;

const rainbowGradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

export const Button = styled.button`
  background-color: ${props => props.secondary === 'true' ? 'var(--secondary)' : 'var(--primary)'};
  color: var(--text-primary);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  z-index: 1;

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 10px;
    background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
    background-size: 300% 300%;
    z-index: -1;
    animation: ${rainbowGradientAnimation} 6s linear infinite;
    opacity: 0.8;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    padding: 2px;
  }

  &:hover {
    background-color: ${props => props.secondary === 'true' ? 'var(--secondary-dark)' : 'var(--primary-dark)'};
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);

    &::before {
      animation: ${rainbowGradientAnimation} 3s linear infinite;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.5);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 5px 10px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;

    &::before {
      animation: none;
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

export const Card = styled.div`
  background-color: rgba(51, 51, 51, 0.3); /* More transparent card background */
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transition: transform 0.3s ease;
  backdrop-filter: blur(15px); /* Increased blur effect for better readability over video */
  -webkit-backdrop-filter: blur(15px); /* For Safari support */

  &:hover {
    transform: translateY(-5px);
  }
`;

export const Flex = styled.div`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  justify-content: ${props => props.justify || 'flex-start'};
  align-items: ${props => props.align || 'stretch'};
  flex-wrap: ${props => props.wrap || 'nowrap'};
  gap: ${props => props.gap || '0'};
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 3}, 1fr);
  gap: ${props => props.gap || '20px'};

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const Heading = styled.h1`
  font-size: ${props => {
    switch (props.level) {
      case 1: return '48px';
      case 2: return '36px';
      case 3: return '28px';
      case 4: return '24px';
      default: return '48px';
    }
  }};
  font-weight: ${props => props.weight || '700'};
  margin-bottom: ${props => props.mb || '24px'};
  line-height: 1.2;
  
  color: #FFFFFF;
  background: none;
  -webkit-text-fill-color: initial;

  @media (max-width: 768px) {
    font-size: ${props => {
      switch (props.level) {
        case 1: return '36px';
        case 2: return '28px';
        case 3: return '24px';
        case 4: return '20px';
        default: return '36px';
      }
    }};
  }

  @media (max-width: 480px) {
     font-size: ${props => {
       switch (props.level) {
         case 1: return '28px';
         case 2: return '24px';
         case 3: return '20px';
         case 4: return '18px';
         default: return '28px';
       }
     }};
   }

   @media (max-width: 360px) {
     font-size: ${props => {
       switch (props.level) {
         case 1: return '24px';
         case 2: return '22px';
         case 3: return '18px';
         case 4: return '16px';
         default: return '24px';
       }
     }};
   }
 `;

export const Text = styled.p`
  font-size: ${props => props.size || '16px'};
  color: ${props => props.color || '#FFFFFF'} !important;
  margin-bottom: ${props => props.mb || '16px'};
  line-height: 1.6;
  transition: color 0.3s ease;

  &:hover, &:focus, &:active {
    color: #FFFFFF !important;
  }
`;

export const Badge = styled.span`
  background-color: ${props => {
    switch (props.type) {
      case 'success': return 'var(--success)';
      case 'warning': return 'var(--warning)';
      case 'error': return 'var(--error)';
      default: return 'var(--primary)';
    }
  }};
  color: var(--text-primary);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background-color: rgba(51, 51, 51, 0.3); /* More transparent input background */
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 16px;
  transition: all 0.3s ease;
  backdrop-filter: blur(15px); /* Increased blur effect for better readability over video */
  -webkit-backdrop-filter: blur(15px); /* For Safari support */

  &:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

export const Divider = styled.hr`
  border: none;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 24px 0;
`;
