import React from 'react';
import {fitTextOnNLines} from '@remotion/layout-utils';

type Props = {
  text: string;
  fontFamily: string;
  maxFontSize: number;
  maxLines: number;
  maxWidth: number;
  fontWeight?: number | string;
  letterSpacing?: string;
  lineHeight?: number;
  color?: string;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  textShadow?: string;
  style?: React.CSSProperties;
};

export const FittedText: React.FC<Props> = ({
  text,
  fontFamily,
  maxFontSize,
  maxLines,
  maxWidth,
  fontWeight,
  letterSpacing,
  lineHeight = 1.15,
  color,
  textTransform = 'none',
  textShadow,
  style,
}) => {
  const fitted = fitTextOnNLines({
    text,
    maxLines,
    maxBoxWidth: maxWidth,
    maxFontSize,
    fontFamily,
    fontWeight,
    letterSpacing,
    textTransform,
  });

  return (
    <div
      style={{
        width: maxWidth,
        fontFamily,
        fontSize: fitted.fontSize,
        fontWeight,
        letterSpacing,
        lineHeight,
        color,
        textTransform,
        textShadow,
        textAlign: 'center',
        ...style,
      }}
    >
      {fitted.lines.map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
          {index > 0 ? <br /> : null}
          {line}
        </React.Fragment>
      ))}
    </div>
  );
};
