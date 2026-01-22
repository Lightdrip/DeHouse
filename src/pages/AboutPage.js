import React from 'react';
import styled from 'styled-components';
import { Container, Section, Heading, Text, Flex, Card, Grid } from '../styles/StyledComponents';

const TeamMemberCard = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 30px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  height: 100%;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover {
    transform: translateY(-12px);
    border-color: var(--primary);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  }

  ${props => props.featured && `
    border: 1px solid rgba(108, 92, 231, 0.3);
    background: linear-gradient(145deg, rgba(108, 92, 231, 0.1) 0%, rgba(51, 51, 51, 0.3) 100%);
  `}
`;

const TeamMemberAvatar = styled.div`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52px;
  font-weight: 700;
  color: var(--text-primary);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  border: 4px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  ${TeamMemberCard}:hover & {
    transform: scale(1.05);
    border-color: var(--primary);
    box-shadow: 0 10px 25px rgba(108, 92, 231, 0.4);
  }
`;

const TeamMemberName = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-primary);
`;

const TeamMemberRole = styled.p`
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 20px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
`;

const TeamMemberBio = styled(Text)`
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 0;
  opacity: 0.9;
`;

const FrostedContent = styled.div`
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 60px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  margin-bottom: 40px;

  @media (max-width: 768px) {
    padding: 30px;
  }
`;

const AboutPage = () => {
  const teamMembers = [
    {
      name: 'Chris Swan',
      role: 'Founder & CEO',
      avatar: 'CS',
      bio: 'Computer scientist with 8+ years of experience in fintech and blockchain technology.',
      featured: true
    },
    {
      name: 'Parkash Acharya',
      role: 'CTO',
      avatar: 'PA',
      bio: 'Full-stack developer specializing in Web3 technologies and smart contract development.',
      featured: true
    },
    {
      name: 'Lino',
      role: 'Senior Dev',
      avatar: 'L',
      bio: 'Expert full-stack developer focused on scaling decentralized applications.',
      featured: false
    },
    {
      name: 'Richard Martinez',
      role: 'Head of Partnerships',
      avatar: 'RM',
      bio: 'Former non-profit director with extensive experience in building strategic relationships.',
      featured: false
    }
  ];

  return (
    <>
      <Section>
        <Container>
          <FrostedContent>
            <Heading level={2}>About deHouse</Heading>
            <Text size="18px" mb="32px">
              deHouse is a pioneering Decentralized Autonomous Organization (DAO) on a mission to revolutionize the real estate landscape through the power of blockchain and collective ownership. By leveraging Real World Asset (RWA) tokenization, we are dismantling the traditional barriers to property ownership and creating a transparent, accessible housing ecosystem for everyone. At our core, deHouse is more than just an investment platform; it is a living community where members can co-own, govern, and actually reside in properties across the globe. We are building a future where housing is a shared asset managed by the people who inhabit it, replacing speculative landlordism with democratic governance and sustainable co-living experiences. Whether you are looking to invest in real estate without the traditional capital hurdles or seeking a vibrant community to call home, deHouse offers a new path where everyone has a voice, a stake, and a place in the future of decentralized housing.
            </Text>
            
            <Flex direction="column" gap="48px">
              <div>
                <Heading level={3}>Our Mission</Heading>
                <Text>
                  Our DAO's mission is to create a transparent, efficient, and rewarding ecosystem with the RWA's that are aquired through donation. By utilizing blockchain technology, we ensure that every donation is traceable, secure, and is accounted for transparently.
                </Text>
              </div>
              
              <div>
                <Heading level={3}>How It Works</Heading>
                <Text>
                  deHouse accepts multiple cryptocurrencies including Bitcoin, Ethereum, Solana, and various stablecoins. When you donate, your contribution is recorded on the blockchain and you receive deHouse points proportional to your donation amount. These points contribute to your ranking on our leaderboard and may unlock special rewards and benefits in the future.
                </Text>
              </div>
              
              <div>
                <Heading level={3}>DAO Treasury</Heading>
                <Text>
                  All donations are managed through our Decentralized Autonomous Organization (DAO) treasury. This ensures that funds are allocated according to community consensus and maintains the highest level of transparency. DAO members can propose and vote on funding allocations to various proposals and projects.
                </Text>
              </div>
            </Flex>
          </FrostedContent>
        </Container>
      </Section>
      
      <Section style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Container>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Heading level={2} style={{ marginBottom: '16px' }}>Our Team</Heading>
            <Text size="18px" style={{ maxWidth: '800px', margin: '0 auto' }}>
              Meet the passionate individuals behind deHouse who are dedicated to revolutionizing charitable giving through blockchain technology.
            </Text>
          </div>
          
          <Grid columns={2} gap="40px">
            {teamMembers.map((member, index) => (
              <TeamMemberCard key={index} featured={member.featured}>
                <TeamMemberAvatar>{member.avatar}</TeamMemberAvatar>
                <TeamMemberName>{member.name}</TeamMemberName>
                <TeamMemberRole>{member.role}</TeamMemberRole>
                <TeamMemberBio>{member.bio}</TeamMemberBio>
              </TeamMemberCard>
            ))}
          </Grid>
        </Container>
      </Section>
    </>
  );
};

export default AboutPage;