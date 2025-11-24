import React from 'react';
import { Card, CardContent, Stack, Typography, Chip } from '@mui/material';

function DataCard({ title, value, description, color }) {
  return (
    <Card
      elevation={8}
      sx={{
        height: '100%',
        borderTop: `4px solid ${color}`,
        backgroundImage: 'linear-gradient(135deg, rgba(19,40,75,0.9), rgba(4,12,24,0.85))',
      }}
    >
      <CardContent>
        <Stack spacing={1}>
          <Chip
            label={title}
            size="small"
            sx={{
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.08)',
              color,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          />
          <Typography variant="h3" component="div" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {description}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default DataCard;