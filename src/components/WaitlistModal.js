import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const rainbowGradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100000;
  animation: ${fadeIn} 0.3s ease-out;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: linear-gradient(145deg, rgba(20, 25, 40, 0.95), rgba(10, 15, 30, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  padding: 32px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  animation: ${slideUp} 0.4s ease-out;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 20px;
  cursor: pointer;
  transition: color 0.2s;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: white;
  }
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  text-align: center;
  color: white;
`;

const HighlightText = styled.span`
  background: linear-gradient(90deg, #3f87a6, #ebf8e1, #f69d3c, #561423, #3f87a6);
  background-size: 300% 300%;
  animation: ${rainbowGradientAnimation} 6s linear infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
`;

const Description = styled.p`
  color: #a0aec0;
  text-align: center;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 10px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  color: #cbd5e0;
  font-weight: 500;
`;

const Input = styled.input`
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 16px;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3f87a6;
    background-color: rgba(255, 255, 255, 0.1);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const SubmitButton = styled.button`
  background: linear-gradient(90deg, #3f87a6, #561423);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(63, 135, 166, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const Message = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  
  ${props => props.type === 'success' && `
    background-color: rgba(72, 187, 120, 0.1);
    color: #48bb78;
    border: 1px solid rgba(72, 187, 120, 0.2);
  `}
  
  ${props => props.type === 'error' && `
    background-color: rgba(245, 101, 101, 0.1);
    color: #f56565;
    border: 1px solid rgba(245, 101, 101, 0.2);
  `}
`;

const NoThanksButton = styled.button`
  background: transparent;
  border: none;
  color: #718096;
  font-size: 14px;
  cursor: pointer;
  margin-top: 8px;
  text-decoration: underline;
  align-self: center;

  &:hover {
    color: #a0aec0;
  }
`;
import { useWaitlist } from '../utils/WaitlistContext';

// ... (keep styled components as is)

const WaitlistModal = () => {
  const { isModalOpen, closeWaitlist } = useWaitlist();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [message, setMessage] = useState('');

  const handleClose = () => {
    closeWaitlist();
    sessionStorage.setItem('waitlist_dismissed', 'true');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Thank you for joining! Bonus points secured.');
        localStorage.setItem('waitlist_joined', 'true');
        
        // Close modal after 3 seconds
        setTimeout(() => {
          closeWaitlist();
        }, 3000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Waitlist submission error:', error);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  if (!isModalOpen) return null;

  return (
    <Overlay>
      <ModalContainer>
        <CloseButton onClick={handleClose} aria-label="Close modal">
          <FaTimes />
        </CloseButton>
        
        <div style={{ textAlign: 'center' }}>
          <Title>
            Join Our Waitlist & <br />
            <HighlightText>Earn Bonus Points!</HighlightText>
          </Title>
        </div>

        <Description>
          Sign up for our waitlist today and receive exclusive bonus points when we launch! Be part of the RWA revolution.
        </Description>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <FaCheckCircle size={50} color="#48bb78" style={{ marginBottom: '16px' }} />
            <Message type="success">{message}</Message>
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <InputGroup>
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                type="text"
                id="name"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={status === 'submitting'}
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="email">Email Address</Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={status === 'submitting'}
                required
              />
            </InputGroup>

            {status === 'error' && (
              <Message type="error">
                <FaExclamationCircle />
                {message}
              </Message>
            )}

            <SubmitButton type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Joining...' : 'Join Waitlist'}
            </SubmitButton>
            
            <NoThanksButton type="button" onClick={handleClose}>
              No thanks, I'll miss out on bonus points
            </NoThanksButton>
          </Form>
        )}
      </ModalContainer>
    </Overlay>
  );
};

export default WaitlistModal;
