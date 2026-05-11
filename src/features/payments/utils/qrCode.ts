import QRCode from 'qrcode';

export const generateQRCode = async (pixCode: string): Promise<string> => {
  if (!pixCode) return '';
  
  try {
    const qrDataUrl = await QRCode.toDataURL(pixCode, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Erro ao gerar QR Code local:', error);
    return '';
  }
};
