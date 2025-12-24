import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTransaction, getUserProfileById } from '../services/api';
import { Button } from '../shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card';
import { ArrowLeft, CheckCircle, Clock, AlertCircle, ShoppingBag, User, Hash, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import SEO from '../components/SEO';

const TransactionDetailPage = () => {
    const { transactionId } = useParams();
    const navigate = useNavigate();
    const [transaction, setTransaction] = useState(null);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTransactionDetails = async () => {
            try {
                setLoading(true);
                const transData = await getTransaction(transactionId);
                setTransaction(transData);
                if (transData && transData.seller_id) {
                    const sellerData = await getUserProfileById(transData.seller_id);
                    setSeller(sellerData);
                }
            } catch (err) {
                setError('Failed to fetch transaction details.');
            } finally {
                setLoading(false);
            }
        };
        fetchTransactionDetails();
    }, [transactionId]);

    if (loading) return <div className="flex justify-center items-center h-screen bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
    if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
    if (!transaction) return <div className="text-center py-10 text-gray-400">Transaction not found.</div>;

    const getStatusInfo = (status) => {
        switch (status) {
            case 'completed': return { icon: CheckCircle, color: 'text-green-400', label: 'Completed' };
            case 'pending': return { icon: Clock, color: 'text-yellow-400', label: 'Pending' };
            case 'failed': return { icon: AlertCircle, color: 'text-red-400', label: 'Failed' };
            default: return { icon: Clock, color: 'text-gray-400', label: 'Unknown' };
        }
    };
    const statusInfo = getStatusInfo(transaction.status);

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <SEO title={`Transaction ${transaction.id}`} description="Details for your recent transaction." />
            <div className="max-w-4xl mx-auto">
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8 text-gray-300 hover:bg-gray-800 hover:text-white">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>

                <Card className="bg-gray-900/50 border-gray-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-3xl">Transaction Details</CardTitle>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusInfo.color} bg-opacity-10`}>
                            <statusInfo.icon className="h-4 w-4" />
                            <span>{statusInfo.label}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <InfoItem icon={ShoppingBag} label="Project Name" value={transaction.project_name} />
                            <InfoItem icon={User} label="Seller" value={seller?.username || 'Loading...'} />
                            <InfoItem icon={Hash} label="Transaction ID" value={transaction.id} />
                            <InfoItem icon={CalendarIcon} label="Date" value={new Date(transaction.created_at).toLocaleString()} />
                        </div>
                        <div className="border-t border-gray-700 pt-6">
                            <InfoItem icon={DollarSign} label="Amount Paid" value={`$${(transaction.amount / 100).toFixed(2)}`} className="text-2xl font-bold text-green-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value, className = '' }) => (
    <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </div>
        <p className={`text-lg font-semibold text-white ${className}`}>{value}</p>
    </div>
);

export default TransactionDetailPage; 