"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Input, Button, Space, Tag, Card, Empty, message, Spin } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Search } = Input;

interface Term {
  id: number;
  term_key: string;
  name: string;
  alias: string | null;
  pinyin: string | null;
  category_id: number | null;
  short_desc: string | null;
  full_desc: string | null;
  status: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

interface TermRelation {
  id: number;
  from_term_id: number;
  to_term_id: number;
  relation_type: string;
  term_name?: string;
  term_key?: string;
}

interface TermDetail extends Term {
  relations?: {
    related: TermRelation[];
    parent: TermRelation[];
    child: TermRelation[];
  };
}

export default function TerminologyPage() {
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<TermDetail | null>(null);
  const [suggestions, setSuggestions] = useState<Term[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 加载术语详情
  const loadTermDetail = useCallback(async (termKey: string) => {
    try {
      const res = await fetch(
        `/api/products/knowledge_base/terminology/${termKey}`
      );
      const data = await res.json();
      if (data.success) {
        setSelectedTerm(data.data);
      }
    } catch (error) {
      console.error("加载术语详情失败:", error);
    }
  }, []);

  // 加载术语列表
  const loadTerms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchKeyword) {
        params.set("q", searchKeyword);
      }

      const res = await fetch(
        `/api/products/knowledge_base/terminology?${params.toString()}`
      );
      const data = await res.json();
      if (data.success) {
        setTerms(data.data || []);
        // 如果列表不为空且没有选中项，自动选中第一项
        if (data.data && data.data.length > 0 && !selectedTerm) {
          loadTermDetail(data.data[0].term_key);
        }
      } else {
        message.error(data.error || "加载术语列表失败");
      }
    } catch (error) {
      console.error("加载术语列表失败:", error);
      message.error("加载术语列表失败");
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, selectedTerm, loadTermDetail]);

  // 搜索联想
  const loadSuggestions = async (keyword: string) => {
    if (keyword.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/products/knowledge_base/terminology/suggest?q=${encodeURIComponent(keyword)}`
      );
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.data || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("加载搜索联想失败:", error);
    }
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    setShowSuggestions(false);
    loadTerms();
  };

  // 处理搜索框变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    loadSuggestions(value);
  };

  // 选择联想项
  const handleSelectSuggestion = (term: Term) => {
    setSearchKeyword(term.name);
    setShowSuggestions(false);
    loadTermDetail(term.term_key);
    loadTerms();
  };

  // 点击相关术语
  const handleRelatedTermClick = (termKey: string) => {
    loadTermDetail(termKey);
  };

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  return (
    <Layout>
      <div className="min-h-screen bg-[var(--color-surface)] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 顶部搜索区 */}
          <div className="mb-6">
            <div className="relative">
              <Search
                placeholder="请输入术语Key、名称、别名或拼音进行搜索（例如：member_level、会员等级、VIP、huiyuan dengji）"
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                value={searchKeyword}
                onChange={handleSearchChange}
                onSearch={handleSearch}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((term) => (
                    <div
                      key={term.id}
                      className="p-3 hover:bg-[var(--color-surface)] cursor-pointer border-b border-[var(--color-border)] last:border-b-0"
                      onClick={() => handleSelectSuggestion(term)}
                    >
                      <div className="font-medium text-[var(--color-text-strong)]">{term.name}</div>
                      {term.short_desc && (
                        <div className="text-sm text-[var(--color-muted)] mt-1 line-clamp-1">
                          {term.short_desc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {terms.length > 0 && searchKeyword && (
              <div className="mt-2 text-sm text-[var(--color-text)]">
                共找到 <strong>{terms.length}</strong> 个相关术语
              </div>
            )}
            {terms.length === 0 && searchKeyword && (
              <div className="mt-2 text-sm text-[var(--color-muted)]">
                未找到相关术语，请尝试更换关键词，或检查拼写。
              </div>
            )}
          </div>

          <div>
            {/* 名词详情区 */}
            <div>
              <Card className="h-full">
                {selectedTerm ? (
                  <div>
                    {/* 标题区 */}
                    <div className="mb-6 pb-4 border-b border-[var(--color-border)]">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-3xl font-bold text-[var(--color-text-strong)]">
                          {selectedTerm.name}
                        </h2>
                        {selectedTerm.category_name && (
                          <Tag color="blue" className="text-base px-3 py-1">
                            {selectedTerm.category_name}
                          </Tag>
                        )}
                      </div>
                    </div>

                    {/* 基础信息区 */}
                    <div className="mb-6 space-y-3">
                      <div>
                        <span className="text-[var(--color-muted)]">术语 Key：</span>
                        <code className="ml-2 px-2 py-1 bg-[var(--color-elevated)] rounded text-sm">
                          {selectedTerm.term_key}
                        </code>
                      </div>
                      {selectedTerm.alias && (
                        <div>
                          <span className="text-[var(--color-muted)]">别名 / 缩写：</span>
                          <span className="ml-2">
                            {selectedTerm.alias
                              .split(",")
                              .map((a) => a.trim())
                              .join(" / ")}
                          </span>
                        </div>
                      )}
                      {selectedTerm.pinyin && (
                        <div>
                          <span className="text-[var(--color-muted)]">拼音 / 简拼：</span>
                          <span className="ml-2 text-[var(--color-text)]">
                            {selectedTerm.pinyin}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 简要说明 */}
                    {selectedTerm.short_desc && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-[var(--color-text-strong)] mb-2">
                          简要说明
                        </h3>
                        <p className="text-[var(--color-text)]">{selectedTerm.short_desc}</p>
                      </div>
                    )}

                    {/* 详细解释 */}
                    {selectedTerm.full_desc && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-[var(--color-text-strong)] mb-2">
                          详细解释
                        </h3>
                        <div className="text-[var(--color-text)] whitespace-pre-wrap">
                          {selectedTerm.full_desc}
                        </div>
                      </div>
                    )}

                    {/* 相关术语区域 */}
                    {selectedTerm.relations &&
                      (selectedTerm.relations.related.length > 0 ||
                        selectedTerm.relations.parent.length > 0 ||
                        selectedTerm.relations.child.length > 0) && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-[var(--color-text-strong)] mb-3">
                            相关术语
                          </h3>
                          <div className="space-y-4">
                            {selectedTerm.relations.parent.length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-[var(--color-text)] mb-2">
                                  上位概念：
                                </div>
                                <Space wrap>
                                  {selectedTerm.relations.parent.map((rel) => (
                                    <Button
                                      key={rel.id}
                                      type="link"
                                      onClick={() =>
                                        handleRelatedTermClick(rel.term_key!)
                                      }
                                    >
                                      {rel.term_name}
                                    </Button>
                                  ))}
                                </Space>
                              </div>
                            )}
                            {selectedTerm.relations.child.length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-[var(--color-text)] mb-2">
                                  下位概念：
                                </div>
                                <Space wrap>
                                  {selectedTerm.relations.child.map((rel) => (
                                    <Button
                                      key={rel.id}
                                      type="link"
                                      onClick={() =>
                                        handleRelatedTermClick(rel.term_key!)
                                      }
                                    >
                                      {rel.term_name}
                                    </Button>
                                  ))}
                                </Space>
                              </div>
                            )}
                            {selectedTerm.relations.related.length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-[var(--color-text)] mb-2">
                                  相关术语：
                                </div>
                                <Space wrap>
                                  {selectedTerm.relations.related.map((rel) => (
                                    <Button
                                      key={rel.id}
                                      type="link"
                                      onClick={() =>
                                        handleRelatedTermClick(rel.term_key!)
                                      }
                                    >
                                      {rel.term_name}
                                    </Button>
                                  ))}
                                </Space>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {/* 更新时间 */}
                    <div className="mt-8 pt-4 border-t border-[var(--color-border)] text-sm text-[var(--color-muted)]">
                      <div>
                        最后更新时间：{dayjs(selectedTerm.updated_at).format("YYYY-MM-DD HH:mm:ss")}
                      </div>
                      <div className="mt-1">
                        创建时间：{dayjs(selectedTerm.created_at).format("YYYY-MM-DD HH:mm:ss")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Spin spinning={loading}>
                      <Empty
                        description={
                          <div>
                            <p className="text-[var(--color-text)] mb-2">
                              欢迎使用名词解释系统
                            </p>
                            <p className="text-sm text-[var(--color-muted)]">
                              请使用上方搜索框查找名词解释
                            </p>
                          </div>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </Spin>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
