"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import {
  Input,
  Button,
  Select,
  Space,
  Tag,
  Card,
  Empty,
  message,
  Spin,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Search } = Input;

interface TermCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  sort_order: number;
}

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
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<"name" | "sort_order">("sort_order");
  const [terms, setTerms] = useState<Term[]>([]);
  const [categories, setCategories] = useState<TermCategory[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<TermDetail | null>(null);
  const [suggestions, setSuggestions] = useState<Term[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const res = await fetch("/api/products/knowledge_base/terminology/categories");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error("加载分类失败:", error);
    }
  };

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
      if (selectedCategory) {
        params.set("category_id", String(selectedCategory));
      }
      params.set("sort_order", sortOrder);

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
  }, [searchKeyword, selectedCategory, sortOrder, selectedTerm, loadTermDetail]);

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

  // 选择分类
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
  };

  // 选择术语
  const handleSelectTerm = (term: Term) => {
    loadTermDetail(term.term_key);
  };

  // 点击相关术语
  const handleRelatedTermClick = (termKey: string) => {
    loadTermDetail(termKey);
    // 重新加载列表以高亮选中的术语
    loadTerms();
  };

  useEffect(() => {
    loadCategories();
    loadTerms();
  }, [loadTerms]);

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return null;
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || null;
  };

  const selectedCategoryName = getCategoryName(selectedCategory);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 顶部搜索区 */}
          <div className="mb-6">
            <div className="relative">
              <Search
                placeholder="请输入名词、缩写或拼音进行搜索（例如：VIP、会员等级、huiyuan dengji）"
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
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((term) => (
                    <div
                      key={term.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSelectSuggestion(term)}
                    >
                      <div className="font-medium text-gray-900">{term.name}</div>
                      {term.short_desc && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {term.short_desc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {terms.length > 0 && searchKeyword && (
              <div className="mt-2 text-sm text-gray-600">
                共找到 <strong>{terms.length}</strong> 个相关术语
              </div>
            )}
            {terms.length === 0 && searchKeyword && (
              <div className="mt-2 text-sm text-gray-500">
                未找到相关术语，请尝试更换关键词，或检查拼写。
              </div>
            )}
          </div>

          <div className="flex gap-6">
            {/* 左侧：分类 + 名词列表区 */}
            <div className="w-1/3 flex-shrink-0">
              <Card className="h-full">
                {/* 分类选择 */}
                <div className="mb-4">
                  <div className="font-semibold text-gray-900 mb-2">分类</div>
                  <Select
                    className="w-full"
                    placeholder="全部"
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    allowClear
                  >
                    {categories.map((cat) => (
                      <Select.Option key={cat.id} value={cat.id}>
                        {cat.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* 排序方式 */}
                <div className="mb-4">
                  <Select
                    className="w-full"
                    value={sortOrder}
                    onChange={(value) => setSortOrder(value)}
                  >
                    <Select.Option value="sort_order">手工排序</Select.Option>
                    <Select.Option value="name">名称 A-Z</Select.Option>
                  </Select>
                </div>

                {/* 名词列表 */}
                <div className="border-t pt-4">
                  <Spin spinning={loading}>
                    {terms.length > 0 ? (
                      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                        {terms.map((term) => (
                          <div
                            key={term.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedTerm?.id === term.id
                                ? "bg-amber-50 border border-amber-200"
                                : "hover:bg-gray-50 border border-transparent"
                            }`}
                            onClick={() => handleSelectTerm(term)}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="font-semibold text-gray-900">
                                {term.name}
                              </span>
                              {term.category_name && (
                                <Tag color="blue" className="ml-2">
                                  {term.category_name}
                                </Tag>
                              )}
                            </div>
                            {term.short_desc && (
                              <div className="text-sm text-gray-600 line-clamp-1">
                                {term.short_desc}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        description="未找到相关术语"
                        className="py-8"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Spin>
                </div>
              </Card>
            </div>

            {/* 右侧：名词详情区 */}
            <div className="flex-1">
              <Card className="h-full">
                {selectedTerm ? (
                  <div>
                    {/* 标题区 */}
                    <div className="mb-6 pb-4 border-b">
                      <div className="flex items-start justify-between mb-2">
                        <h2 className="text-3xl font-bold text-gray-900">
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
                        <span className="text-gray-500">术语 Key：</span>
                        <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
                          {selectedTerm.term_key}
                        </code>
                      </div>
                      {selectedTerm.alias && (
                        <div>
                          <span className="text-gray-500">别名 / 缩写：</span>
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
                          <span className="text-gray-500">拼音 / 简拼：</span>
                          <span className="ml-2 text-gray-600">
                            {selectedTerm.pinyin}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 简要说明 */}
                    {selectedTerm.short_desc && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          简要说明
                        </h3>
                        <p className="text-gray-700">{selectedTerm.short_desc}</p>
                      </div>
                    )}

                    {/* 详细解释 */}
                    {selectedTerm.full_desc && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          详细解释
                        </h3>
                        <div className="text-gray-700 whitespace-pre-wrap">
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
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            相关术语
                          </h3>
                          <div className="space-y-4">
                            {selectedTerm.relations.parent.length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-gray-600 mb-2">
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
                                <div className="text-sm font-medium text-gray-600 mb-2">
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
                                <div className="text-sm font-medium text-gray-600 mb-2">
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
                    <div className="mt-8 pt-4 border-t text-sm text-gray-500">
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
                    <Empty
                      description={
                        <div>
                          <p className="text-gray-600 mb-2">
                            欢迎使用名词解释系统
                          </p>
                          <p className="text-sm text-gray-500">
                            请在左侧选择术语，或使用搜索功能查找名词解释
                          </p>
                        </div>
                      }
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
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
