'use client';
import { useState } from 'react';
import { Head } from '../../components/Common';
import Students from './Students';
import Overview from './Overview';
import Audit from './Audit';
import Branding from './Branding';
import Questions from './Questions';
import Categories from './Categories';
import PaymentReview from './PaymentReview';
import AccessManagement from './AccessManagement';
import Configuration from './Configuration';
export default function Admin() { const [tab, setTab] = useState('overview'); return <><Head title="Admin dashboard" description="Manage enrollment, access and academic content."/><div className="page-tabs">{[['overview', 'Overview'], ['payments', 'Payments'], ['access', 'Access'], ['students', 'Students'], ['questions', 'Questions'], ['categories', 'Categories'], ['packages', 'Packages'], ['accounts', 'Payment accounts'], ['branding', 'Branding'], ['audit', 'Audit history']].map(([k, n]) => <button className={tab === k ? 'active' : ''} onClick={() => setTab(k)} key={k}>{n}</button>)}</div>{tab === 'overview' ? <Overview navigate={setTab}/> : tab === 'payments' ? <PaymentReview /> : tab === 'access' ? <AccessManagement /> : tab === 'questions' ? <Questions /> : tab === 'categories' ? <Categories /> : tab === 'students' ? <Students /> : tab === 'branding' ? <Branding /> : tab === 'audit' ? <Audit /> : <Configuration type={tab}/>}</>; }
